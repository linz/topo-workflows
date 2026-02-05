import { ApiObject, Chart, ChartProps, Helm } from 'cdk8s';
import { Namespace, ServiceAccount } from 'cdk8s-plus-33';
import { KubeClusterRole, KubeClusterRoleBinding } from 'cdk8s-plus-33/lib/imports/k8s.js';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface ArgoEventsProps {}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/b8fc7466465c617f270256ded8d6c6d3d57ea524/charts/argo-events/Chart.yaml#L5C10-L5C16
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '2.4.20';

/**
 * This is the version of Argo Events for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/b8fc7466465c617f270256ded8d6c6d3d57ea524/charts/argo-events/Chart.yaml#L2
 *
 */
const appVersion = 'v1.9.10';

const namespace = 'argo-events';

export class ArgoEvents extends Chart {
  constructor(scope: Construct, id: string, props: ArgoEventsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-events', appVersion, 'argo', 'events'));

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

    // Create a cluster role so it can operate workflows in any namespace
    const operateWorkflowCr = new KubeClusterRole(this, 'OperateWorkflowCr', {
      metadata: { name: 'operate-workflow-role' },
      rules: [
        {
          verbs: ['create', 'get', 'list'],
          apiGroups: ['argoproj.io'],
          resources: ['workflows', 'workflowtemplates', 'cronworkflows', 'clusterworkflowtemplates'],
        },
      ],
    });

    new KubeClusterRoleBinding(this, 'OperateWorkflowCrb', {
      metadata: { name: 'operate-workflow-role-binding' },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: operateWorkflowCr.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: operateWorkflowSa.name,
          namespace: operateWorkflowSa.metadata.namespace,
        },
      ],
    });

    new ApiObject(this, 'EventBusDefault', {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'EventBus',
      metadata: {
        name: 'default',
      },
      spec: {
        nats: {
          native: {
            replicas: 3,
            auth: 'token',
          },
        },
      },
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
