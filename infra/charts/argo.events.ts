import { Chart, ChartProps, Helm } from 'cdk8s';
import { Namespace, ServiceAccount } from 'cdk8s-plus-33';
import { KubeClusterRole, KubeClusterRoleBinding } from 'cdk8s-plus-33/lib/imports/k8s.js';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';
import { EventBus } from './imports/argo-events/argoproj.io.eventbus.ts';
import { EventSource } from './imports/argo-events/argoproj.io.eventsources.ts';
import { Sensor } from './imports/argo-events/argoproj.io.sensors.ts';

export interface ArgoEventsProps {
  /**
   * Name of the Service Account used to manage events
   *
   * @example "event-sa"
   */
  saName: string;

  /**
   * Name of the SQS queue to listen to for events about copying ODR data
   *
   * @example "linz-workflows-scratch-copy-odr-queue"
   */
  sqsCopyOdrQueueName: string;
}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/b8fc7466465c617f270256ded8d6c6d3d57ea524/charts/argo-events/Chart.yaml#L5C10-L5C16
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
    const operateWorkflowSaName = 'operate-workflow-sa';
    this.createServiceAccountsAndRoles(operateWorkflowSaName);
    this.createResources(props, operateWorkflowSaName);
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

  private createResources(props: ArgoEventsProps, operateWorkflowSaName: string): void {
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

    new EventSource(this, 'AwsSqsCopyOdrEventSource', {
      metadata: {
        name: 'aws-sqs-copy-odr',
      },
      spec: {
        template: {
          serviceAccountName: props.saName,
        },
        sqs: {
          'copy-odr': {
            jsonBody: true,
            region: 'ap-southeast-2',
            queue: props.sqsCopyOdrQueueName,
            waitTimeSeconds: 20,
          },
        },
      },
    });

    new Sensor(this, 'WfCopyOdrSensor', {
      metadata: {
        name: 'wf-copy-odr',
      },
      spec: {
        template: {
          serviceAccountName: operateWorkflowSaName,
        },
        dependencies: [
          {
            name: 'copy-odr',
            eventSourceName: 'aws-sqs-copy-odr',
            eventName: 'copy-odr',
          },
        ],
        triggers: [
          {
            template: {
              name: 'trigger-wf-copy-odr',
              argoWorkflow: {
                operation: 'submit',
                source: {
                  resource: {
                    apiVersion: 'argoproj.io/v1alpha1',
                    kind: 'Workflow',
                    metadata: {
                      generateName: 'test-print-',
                      namespace: 'argo',
                    },
                    spec: {
                      arguments: {
                        parameters: [
                          {
                            name: 'message',
                            value: '',
                          },
                        ],
                      },
                      workflowTemplateRef: {
                        name: 'test-print',
                      },
                    },
                  },
                },
                parameters: [
                  {
                    src: {
                      dependencyName: 'copy-odr',
                      dataKey: 'body',
                    },
                    dest: 'spec.arguments.parameters.0.value',
                  },
                ],
              },
            },
          },
        ],
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
