import { Chart, ChartProps } from 'cdk8s';
import {
  ApiResource,
  ClusterRole,
  ConfigMap,
  Deployment,
  ImagePullPolicy,
  Node,
  NodeLabelQuery,
  ServiceAccount,
  Volume,
} from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

const version = 'v1.5';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'event-exporter', version, 'event-exporter', 'event-exporter'));

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
        'config.yaml': `logLevel: error
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

    const deployment = new Deployment(this, 'event-exporter', {
      metadata: { name: 'event-exporter', namespace: 'monitoring' },
      replicas: 1,
      podMetadata: {
        labels: { app: 'event-exporter', version: 'v1' },
        annotations: { 'prometheus.io/scrape': 'true', 'prometheus.io/port': '2112', 'prometheus.io/path': '/metrics' },
      },
      containers: [
        {
          image: `ghcr.io/resmoio/kubernetes-event-exporter:${version}`,
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

    const onDemandNode = Node.labeled(
      NodeLabelQuery.is('eks.amazonaws.com/capacityType', 'ON_DEMAND'), // Making sure not running on spot
      NodeLabelQuery.is('kubernetes.io/arch', 'amd64'), // Making sure not running on ARM
      NodeLabelQuery.is('kubernetes.io/os', 'linux'),
    );
    // This uses the `affinity` constraint rather than `nodeSelector`: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity
    deployment.scheduling.attract(onDemandNode);
  }
}
