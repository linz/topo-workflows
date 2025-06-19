import { Chart, ChartProps, Helm } from 'cdk8s';
import { ApiResource, ClusterRole, Namespace, ServiceAccount } from 'cdk8s-plus-32';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/** This is the chart version vs app version which is 1.7.0
 *  https://github.com/bitnami/charts/blob/dbcee8a0b5e14163163aecc2935b908943ec5bdb/bitnami/kubernetes-event-exporter/Chart.yaml
 */
const chartVersion = '3.5.6';

const appVersion = '1.7.0';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'event-exporter', appVersion, 'event-exporter', 'event-exporter'));

    new Namespace(this, 'namespace', {
      metadata: { name: props.namespace },
    });

    const serviceAccount = new ServiceAccount(this, 'event-exporter-sa', {
      metadata: { name: 'event-exporter', namespace: props.namespace },
    });

    // https://cdk8s.io/docs/latest/plus/cdk8s-plus-32/rbac/#role
    const clusterRole = new ClusterRole(this, 'event-exporter-cr', {
      metadata: { name: 'event-exporter' },
    });
    clusterRole.allowRead(ApiResource.custom({ apiGroup: '*', resourceType: '*' }));
    // create a ClusterRoleBinding
    clusterRole.bind(serviceAccount);

    new Helm(this, 'kubernetes-event-exporter', {
      chart: 'oci://registry-1.docker.io/bitnamicharts/kubernetes-event-exporter',
      namespace: 'event-exporter',
      version: chartVersion,
      values: {
        config: {
          logLevel: 'error',
          logFormat: 'json',
        },
        serviceAccount: {
          create: false,
          name: serviceAccount.name,
          automountServiceAccountToken: true,
        },
      },
    });
  }
}
