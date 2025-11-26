import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';
import { Namespace, ServiceAccount } from 'cdk8s-plus-32';
import { KubeClusterRole, KubeClusterRoleBinding } from 'cdk8s-plus-32/lib/imports/k8s.js';

export interface ArgoEventsProps {}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/221f4d5e837b87c6c54cbcb14a88b5cf4bbf7446/charts/argo-events/Chart.yaml#L5
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '2.4.17';

/**
 * This is the version of Argo Events for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/221f4d5e837b87c6c54cbcb14a88b5cf4bbf7446/charts/argo-events/Chart.yaml#L2
 *
 */
const appVersion = 'v1.9.8';

const namespace = 'argo-events';

export class ArgoEvents extends Chart {
  constructor(scope: Construct, id: string, props: ArgoEventsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-events', appVersion, 'logs', 'events'));

    new Namespace(this, 'ArgoEventsNamespace', {
      metadata: { name: 'argo-events' },
    });

    const operateWorkflowSa = new ServiceAccount(this, 'OperateWorkflowSa', {
      metadata: {
        name: 'operate-workflow-sa',
        namespace,
      },
      automountToken: true,
    });

    const cr = new KubeClusterRole(this, 'WorkflowsTriggerCR', {
      metadata: { name: 'workflows-trigger-cr' },
      rules: [
        {
          verbs: ['create', 'get', 'list'],
          apiGroups: ['argoproj.io'],
          resources: ['workflows'],
        },
      ],
    });

    new KubeClusterRoleBinding(this, 'WorkflowsTriggerCRB', {
      metadata: { name: 'workflows-trigger-crb' },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: cr.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: operateWorkflowSa.name,
          namespace: operateWorkflowSa.metadata.namespace,
        },
      ],
    });

    new Helm(this, 'argo-events', {
      chart: 'argo-events',
      releaseName: 'argo-events',
      repo: 'https://argoproj.github.io/argo-helm',
      namespace,
      version: chartVersion,
      values: {},
    });
  }
}
