import { Chart, ChartProps } from 'cdk8s';
import { Construct } from 'constructs';

import { KubeClusterRole, KubeClusterRoleBinding, KubeServiceAccount } from '../imports/k8s';
import { applyDefaultLabels } from '../util/labels.js';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'coredns', 'v1', 'kube-dns', 'kube-dns'));

    const serviceAccount = new KubeServiceAccount(this, 'event-exporter-sa', {
      metadata: { name: 'event-exporter', namespace: 'monitoring' },
    });

    const clusterRole = new KubeClusterRole(this, 'event-exporter-cr', {
      metadata: { name: 'event-exporter' },
      rules: [
        {
          apiGroups: ['*'],
          resources: ['*'],
          verbs: ['get', 'watch', 'list'],
        },
      ],
    });

    new KubeClusterRoleBinding(this, 'event-exporter-crb', {
      metadata: {
        name: 'event-exporter',
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: clusterRole.kind,
        name: clusterRole.name,
      },
      subjects: [
        {
          kind: serviceAccount.kind,
          name: serviceAccount.name,
          namespace: 'monitoring',
        },
      ],
    });
  }
}
