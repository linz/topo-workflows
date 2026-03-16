import { Chart, ChartProps } from 'cdk8s';
import { Construct } from 'constructs';
import {
  AgentPresetMode,
  AgentPresetStatePersistence,
  Elasticagent,
  ElasticAgentAgentEngine,
} from './imports/elastic-agent/elastic.agent.ts';

import { applyDefaultLabels } from '../util/labels.ts';
import { Namespace } from 'cdk8s-plus-33';

const appVersion = '9.3.1';

export interface ElasticAgentProps {
  fleetUrl: string;
  fleetToken: string;
}

export class ElasticAgent extends Chart {
  constructor(scope: Construct, id: string, props: ElasticAgentProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'elastic-agent', appVersion, 'monitoring', 'workflows'));

    const monitoringNamespace = new Namespace(this, 'MonitoringNamespace', {
      metadata: { name: 'monitoring' },
    });

    // https://www.elastic.co/docs/reference/fleet/example-kubernetes-fleet-managed-agent-helm
    new Elasticagent(this, 'elastic-agent', {
      namespace: monitoringNamespace.name,
      values: {
        agent: {
          fleet: { enabled: true, url: props.fleetUrl, token: props.fleetToken },
          version: appVersion,
          presets: {
            // Need to override the default perNode preset in order to set the tolerations. Everything else is taken from https://github.com/elastic/elastic-agent/blob/671f3a2f795516f4fdb34998b5b9a82532c8b5ae/deploy/helm/elastic-agent/values.yaml
            perNode: {
              mode: AgentPresetMode.DAEMONSET,
              serviceAccount: { create: true },
              clusterRole: { create: true },
              hostNetwork: true,
              resources: {
                limits: { memory: '1000Mi' },
                requests: { cpu: '100m', memory: '400Mi' },
              },
              nodeSelector: { 'kubernetes.io/os': 'linux' },
              statePersistence: AgentPresetStatePersistence.EMPTY_DIR,
              extraEnvs: [{ name: 'ELASTIC_NETINFO', value: 'false' }],
              agent: {
                monitoring: {
                  namespace: 'default',
                  useOutput: 'default',
                  enabled: true,
                  logs: true,
                  metrics: true,
                },
              },
              providers: { kubernetes: { node: '${NODE_NAME}', scope: 'node' } },
              tolerations: [
                { key: 'karpenter.sh/capacity-type', operator: 'Equal', value: 'spot', effect: 'NoSchedule' },
                { key: 'karpenter.sh/disrupted', operator: 'Exists', effect: 'NoSchedule' },
              ],
            },
          },
          engine: ElasticAgentAgentEngine.K8S,
        },
        outputs: {},
        system: { enabled: true, output: 'default' },
      },
    });
  }
}
