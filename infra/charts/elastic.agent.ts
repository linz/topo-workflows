import { Chart, ChartProps } from 'cdk8s';
import { Namespace } from 'cdk8s-plus-33';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.ts';
import {
  AgentPresetMode,
  AgentPresetStatePersistence,
  Elasticagent,
  ElasticAgentAgentEngine,
} from './imports/elastic-agent/elastic.agent.ts';

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
    // Most of the values taken from https://github.com/elastic/elastic-agent/blob/v9.3.1/deploy/kubernetes/elastic-agent-managed-kubernetes.yaml
    new Elasticagent(this, 'elastic-agent', {
      namespace: monitoringNamespace.name,
      values: {
        agent: {
          fleet: {
            enabled: true,
            url: props.fleetUrl,
            token: props.fleetToken,
            insecure: false,
          },
          version: appVersion,
          presets: {
            perNode: {
              mode: AgentPresetMode.DAEMONSET,
              serviceAccount: { create: true },
              clusterRole: { create: true },
              hostNetwork: true,
              resources: {
                limits: { memory: '1200Mi' },
                requests: { cpu: '100m', memory: '500Mi' },
              },
              securityContext: {
                runAsUser: 0,
              },
              extraEnvs: [
                { name: 'ELASTIC_NETINFO', value: 'false' },
                { name: 'NODE_NAME', valueFrom: { fieldRef: { fieldPath: 'spec.nodeName' } } },
                { name: 'POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
              ],
              providers: {
                kubernetes: { node: '${NODE_NAME}', scope: 'node' },
              },
              statePersistence: AgentPresetStatePersistence.HOST_PATH,
              tolerations: [
                { key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' },
                { key: 'node-role.kubernetes.io/master', effect: 'NoSchedule' },
                { key: 'karpenter.sh/capacity-type', operator: 'Equal', value: 'spot', effect: 'NoSchedule' },
              ],
              extraVolumes: [
                { name: 'proc', hostPath: { path: '/proc' } },
                { name: 'cgroup', hostPath: { path: '/sys/fs/cgroup' } },
                { name: 'varlibdockercontainers', hostPath: { path: '/var/lib/docker/containers' } },
                { name: 'varlog', hostPath: { path: '/var/log' } },
                { name: 'etc-full', hostPath: { path: '/etc' } },
                { name: 'var-lib', hostPath: { path: '/var/lib' } },
                { name: 'etc-mid', hostPath: { path: '/etc/machine-id', type: 'File' } },
                { name: 'sys-kernel-debug', hostPath: { path: '/sys/kernel/debug' } },
                // Needed for the mount that automatically adds the Helm
                {
                  name: 'agent-data',
                  hostPath: {
                    path: `/var/lib/elastic-agent-managed/${monitoringNamespace.name}/state`,
                    type: 'DirectoryOrCreate',
                  },
                },
              ],

              extraVolumeMounts: [
                { name: 'proc', mountPath: '/hostfs/proc', readOnly: true },
                { name: 'cgroup', mountPath: '/hostfs/sys/fs/cgroup', readOnly: true },
                { name: 'varlibdockercontainers', mountPath: '/var/lib/docker/containers', readOnly: true },
                { name: 'varlog', mountPath: '/var/log', readOnly: true },
                { name: 'etc-full', mountPath: '/hostfs/etc', readOnly: true },
                { name: 'var-lib', mountPath: '/hostfs/var/lib', readOnly: true },
                { name: 'etc-mid', mountPath: '/etc/machine-id', readOnly: true },
                { name: 'sys-kernel-debug', mountPath: '/sys/kernel/debug' },
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
