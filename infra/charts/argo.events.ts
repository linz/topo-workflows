import { Chart, ChartProps, Helm } from 'cdk8s';
import { Namespace, ServiceAccount } from 'cdk8s-plus-37';
import { KubeClusterRole, KubeClusterRoleBinding } from 'cdk8s-plus-37/lib/imports/k8s.js';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';
import { EventBus } from './imports/argo-events/argoproj.io.eventbus.ts';
import { EventSource } from './imports/argo-events/argoproj.io.eventsources.ts';

export interface ArgoEventsProps {
  /**
   * Name of the Service Account used to manage events
   *
   * @example "event-sa"
   */
  saName: string;

  /**
   * Name of the SQS queue to listen to for events about bucket changes such as object created, deleted, etc.
   */
  sqsBucketEventsQueueName: string;
}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/f60d55861d0ed6052f807d981343bd84b9a5de06/charts/argo-events/Chart.yaml#L5
 */
const chartVersion = '2.4.27';

/**
 * This is the version of Argo Events for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/f60d55861d0ed6052f807d981343bd84b9a5de06/charts/argo-events/Chart.yaml#L2
 *
 * After changing it, run `scripts/bump-argo-versions.sh`
 */
const appVersion = 'v1.9.11';

const namespace = 'argo-events';

export class ArgoEvents extends Chart {
  constructor(scope: Construct, id: string, props: ArgoEventsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-events', appVersion, 'argo', 'events'));
    const operateWorkflowSaName = 'operate-workflow-sa';
    this.createServiceAccountsAndRoles(operateWorkflowSaName);
    this.createResources(props);
    this.createArgoEventBase();
  }

  private createServiceAccountsAndRoles(operateWorkflowSaName: string): void {
    new Namespace(this, 'ArgoEventsNamespace', {
      metadata: { name: 'argo-events' },
    });

    const operateWorkflowSa = new ServiceAccount(this, 'OperateWorkflowSa', {
      metadata: {
        name: operateWorkflowSaName,
        namespace,
      },
      automountToken: true,
    });

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
  }

  private createResources(props: ArgoEventsProps): void {
    new EventBus(this, 'EventBusDefault', {
      metadata: {
        name: 'default',
      },
      spec: {
        jetstream: {
          version: '2.10.10',
          containerTemplate: {
            priorityClassName: 'high-priority',
            resources: {
              requests: {
                cpu: '50m',
                memory: '128Mi',
              },
              limits: {
                cpu: '200m',
                memory: '256Mi',
              },
            },
          },
        },
      },
    });

    new EventSource(this, 'AwsSqsBucketEventsEventSource', {
      metadata: {
        name: 'aws-sqs-bucket-events',
      },
      spec: {
        template: {
          serviceAccountName: props.saName,
        },
        sqs: {
          'bucket-events': {
            jsonBody: true,
            region: 'ap-southeast-2',
            queue: props.sqsBucketEventsQueueName,
            waitTimeSeconds: 20,
          },
        },
      },
    });
  }

  private createArgoEventBase(): void {
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
