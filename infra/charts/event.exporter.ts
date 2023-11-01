import { Chart, ChartProps } from 'cdk8s';
import {
  ApiResource,
  ClusterRole,
  ConfigMap,
  Deployment,
  ImagePullPolicy,
  ServiceAccount,
  Volume,
} from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'event-exporter', 'v1', 'event-exporter', 'event-exporter'));

    const serviceAccount = new ServiceAccount(this, 'event-exporter-sa', {
      metadata: { name: 'event-exporter', namespace: 'monitoring' },
      // This is the kubernetes default value? and it is not specified here: https://github.com/resmoio/kubernetes-event-exporter/blob/master/deploy/00-roles.yaml
      automountToken: true,
    });

    // https://cdk8s.io/docs/latest/plus/cdk8s-plus-27/rbac/#role
    const clusterRole = new ClusterRole(this, 'event-exporter-cr', {
      metadata: { name: 'event-exporter' },
    });
    clusterRole.allowRead(ApiResource.custom({ apiGroup: '*', resourceType: '*' }));
    // create a ClusterRoleBinding
    clusterRole.bind(serviceAccount);

    const cm = new ConfigMap(this, 'event-exporter-cfg', {
      metadata: { name: 'event-exporter-cfg', namespace: 'monitoring' },
      data: {
        //FIXME do like cloudflared
        'config.yaml': `logLevel: warn
    logFormat: json
    metricsNamePrefix: event_exporter_
    route:
      routes:
        - match:
          - receiver: "dump"
    receivers:
      - name: "dump"
        stdout: {}`,
      },
    });

    new Deployment(this, 'event-exporter', {
      metadata: { name: 'event-exporter', namespace: 'monitoring' },
      replicas: 1,
      podMetadata: {
        labels: { app: 'event-exporter', version: 'v1' },
        annotations: { 'prometheus.io/scrape': 'true', 'prometheus.io/port': '2112', 'prometheus.io/path': '/metrics' },
      },
      containers: [
        {
          image: 'ghcr.io/resmoio/kubernetes-event-exporter:latest',
          imagePullPolicy: ImagePullPolicy.IF_NOT_PRESENT,
          args: ['conf=/data/config.yaml'],
          name: 'event-exporter',
          volumeMounts: [{ path: '/data', volume: Volume.fromConfigMap(this, 'cfg', cm, { name: 'cfg' }) }],
          securityContext: { allowPrivilegeEscalation: false },
        },
      ],
      serviceAccount: serviceAccount,
      securityContext: { ensureNonRoot: true },
    });
  }
}
