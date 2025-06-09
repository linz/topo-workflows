import { Chart, ChartProps } from 'cdk8s';
import {
  ApiResource,
  ClusterRole,
  ConfigMap,
  Deployment,
  ImagePullPolicy,
  Namespace,
  ServiceAccount,
  Volume,
} from 'cdk8s-plus-31';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/** `resmoio/kubernetes-event-exporter` image version */
const version = 'v1.5';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'event-exporter', version, 'event-exporter', 'event-exporter'));

    new Namespace(this, 'namespace', {
      metadata: { name: props.namespace },
    });

    const serviceAccount = new ServiceAccount(this, 'event-exporter-sa', {
      metadata: { name: 'event-exporter', namespace: props.namespace },
    });

    // https://cdk8s.io/docs/latest/plus/cdk8s-plus-31/rbac/#role
    const clusterRole = new ClusterRole(this, 'event-exporter-cr', {
      metadata: { name: 'event-exporter' },
    });
    clusterRole.allowRead(ApiResource.custom({ apiGroup: '*', resourceType: '*' }));
    // create a ClusterRoleBinding
    clusterRole.bind(serviceAccount);

    const cm = new ConfigMap(this, 'event-exporter-cfg', {
      metadata: { name: 'event-exporter-cfg', namespace: props.namespace },
      data: {
        //FIXME do like cloudflared
        'config.yaml': `
logLevel: error
logFormat: json
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
      metadata: { name: 'event-exporter', namespace: props.namespace },
      replicas: 1,
      podMetadata: {
        labels: { app: 'event-exporter', version: 'v1' },
      },
      containers: [
        {
          image: `ghcr.io/resmoio/kubernetes-event-exporter:${version}`,
          imagePullPolicy: ImagePullPolicy.IF_NOT_PRESENT,
          args: ['-conf=/data/config.yaml'],
          name: 'event-exporter',
          volumeMounts: [{ path: '/data', volume: Volume.fromConfigMap(this, 'cfg', cm, { name: 'cfg' }) }],
          securityContext: { allowPrivilegeEscalation: false },
        },
      ],
      serviceAccount: serviceAccount,
      securityContext: { ensureNonRoot: true },
      automountServiceAccountToken: true,
    });
  }
}
