import { Chart, ChartProps } from 'cdk8s';
import { ConfigMap, Namespace } from 'cdk8s-plus-32';
import {
  IntOrString,
  KubeClusterRole,
  KubeClusterRoleBinding,
  KubeDeployment,
  KubeNetworkPolicy,
  KubePodDisruptionBudget,
  KubeServiceAccount,
  Quantity,
} from 'cdk8s-plus-32/lib/imports/k8s.js';
import { Construct } from 'constructs';

import { ClusterName } from '../constants.js';
import { applyDefaultLabels } from '../util/labels.js';

const appName = 'event-exporter';
const appVersion = '1.7';

export class EventExporter extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, appName, appVersion, appName, appName));
    const namespace = props.namespace ?? appName;
    new Namespace(this, 'namespace', {
      metadata: { name: namespace },
    });

    const config = new ConfigMap(this, 'config', {
      metadata: {
        name: 'event-exporter-config',
        namespace: namespace,
      },
      immutable: true, //we don't expect this to change on runtime
      data: {
        'config.yaml': [
          `clusterName: ${ClusterName}`,
          'logLevel: error',
          'logFormat: json',
          'receivers:',
          '  - name: dump',
          '    file:',
          '      path: /dev/stdout',
          'route:',
          '  routes:',
          '    - match:',
          '        - receiver: dump',
        ].join('\n'),
      },
    });

    const sa = new KubeServiceAccount(this, 'service-account', {
      metadata: {
        name: appName,
        namespace,
      },
      automountServiceAccountToken: true,
    });

    // Most of these config has been taken from Bitnami Helm chart (https://github.com/bitnami/charts/blob/e07d3319b61f49ddf6f431da3ed7ec0e0be3d5d0/bitnami/kubernetes-event-exporter/values.yaml)
    new KubeDeployment(this, 'event-exporter-deployment', {
      metadata: {
        name: appName,
        namespace,
        labels: super.labels,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: { app: appName },
        },
        template: {
          metadata: {
            labels: { app: appName },
          },
          spec: {
            serviceAccountName: sa.name,
            automountServiceAccountToken: true,
            priorityClassName: 'very-high-priority',
            securityContext: {
              fsGroup: 1001,
              fsGroupChangePolicy: 'Always',
              supplementalGroups: [],
              sysctls: [],
            },

            containers: [
              {
                name: appName,
                image: `ghcr.io/resmoio/kubernetes-event-exporter:v${appVersion}`,
                imagePullPolicy: 'IfNotPresent',
                args: ['-conf=/data/config.yaml'],
                ports: [{ name: 'http', protocol: 'TCP', containerPort: 2112 }],
                volumeMounts: [
                  {
                    name: 'config',
                    mountPath: '/data',
                  },
                ],
                resources: {
                  requests: {
                    cpu: Quantity.fromString('100m'),
                    memory: Quantity.fromString('128Mi'),
                    'ephemeral-storage': Quantity.fromString('50Mi'),
                  },
                  limits: {
                    cpu: Quantity.fromString('150m'),
                    memory: Quantity.fromString('192Mi'),
                    'ephemeral-storage': Quantity.fromString('2Gi'),
                  },
                },
                securityContext: {
                  allowPrivilegeEscalation: false,
                  capabilities: { drop: ['ALL'] },
                  privileged: false,
                  readOnlyRootFilesystem: true,
                  runAsUser: 1001,
                  runAsGroup: 1001,
                  runAsNonRoot: true,
                  seLinuxOptions: {},
                  seccompProfile: { type: 'RuntimeDefault' },
                },
                livenessProbe: {
                  httpGet: { path: '/-/healthy', port: IntOrString.fromString('http') },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                  successThreshold: 1,
                  failureThreshold: 5,
                  timeoutSeconds: 2,
                },
                readinessProbe: {
                  httpGet: { path: '/-/ready', port: IntOrString.fromString('http') },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                  successThreshold: 1,
                  failureThreshold: 1,
                  timeoutSeconds: 2,
                },
              },
            ],
            volumes: [
              {
                name: 'config',
                configMap: {
                  name: config.name,
                },
              },
            ],
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [
                  {
                    weight: 1,
                    podAffinityTerm: {
                      labelSelector: {
                        matchLabels: super.labels,
                      },
                      topologyKey: 'kubernetes.io/hostname',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });

    new KubeNetworkPolicy(this, 'network-policy', {
      metadata: {
        name: appName,
        namespace,
      },
      spec: {
        podSelector: { matchLabels: super.labels },
        policyTypes: ['Ingress', 'Egress'],
        ingress: [
          {
            ports: [{ port: IntOrString.fromNumber(2112) }],
          },
        ],
        egress: [{}],
      },
    });

    new KubePodDisruptionBudget(this, 'pdb', {
      metadata: {
        name: appName,
        namespace,
      },
      spec: {
        maxUnavailable: IntOrString.fromNumber(1), // matches Helm
        selector: { matchLabels: super.labels },
      },
    });

    new KubeClusterRole(this, 'cluster-role', {
      metadata: { name: appName },
      rules: [
        {
          apiGroups: ['*'],
          resources: ['*'],
          verbs: ['get', 'list', 'watch'],
        },
      ],
    });

    new KubeClusterRoleBinding(this, 'cluster-role-binding', {
      metadata: { name: appName },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: appName,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: sa.name,
          namespace: sa.metadata.namespace,
        },
      ],
    });
  }
}
