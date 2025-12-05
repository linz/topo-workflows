import { App } from 'cdk8s';

import { ArgoExtras } from './charts/argo.extras.js';
import { ArgoSecretsChart } from './charts/argo.secrets.js';
import { ArgoWorkflows } from './charts/argo.workflows.js';
import { Cloudflared } from './charts/cloudflared.js';
import { EventExporter } from './charts/event.exporter.js';
import { FluentBit } from './charts/fluentbit.js';
import { Karpenter, KarpenterNodePool } from './charts/karpenter.js';
import { CoreDns } from './charts/kube-system.coredns.js';
import { NodeLocalDns } from './charts/kube-system.node.local.dns.js';
import { PriorityClasses } from './charts/priority.class.js';
import {
  ArgoDbInstanceName,
  CfnOutputKeys,
  ClusterName,
  ScratchBucketName,
  UseNodeLocalDns,
  validateKeys,
} from './constants.js';
import { describeCluster, getCfnOutputs } from './util/cloud.formation.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const [clusterCfnOutputs, argoDbCfnOutputs, ssmConfig, clusterConfig] = await Promise.all([
    getCfnOutputs(ClusterName),
    getCfnOutputs(ArgoDbInstanceName),
    fetchSsmParameters({
      // Config for Cloudflared to access argo-server
      cloudflaredTunnelId: '/eks/cloudflared/argo/tunnelId',
      cloudflaredTunnelSecret: '/eks/cloudflared/argo/tunnelSecret',
      cloudflaredTunnelName: '/eks/cloudflared/argo/tunnelName',
      cloudflaredAccountId: '/eks/cloudflared/argo/accountId',

      // Personal access token to gain access to linz-li-bot github user
      githubPat: '/eks/github/linz-li-bot/pat',

      // Argo Database connection password
      argoDbPassword: '/eks/argo/postgres/password',

      // Argo Workflows secrets for S3 Batch Operations Restore
      s3BatchRestoreAccountIdHydro: '/eks/S3BatchRestore/accountIdHydro',
      s3BatchRestoreAccountIdTopo: '/eks/S3BatchRestore/accountIdTopo',
      s3BatchRestoreRoleArn: '/eks/S3BatchRestore/roleArn',
    }),
    describeCluster(ClusterName),
  ]);
  const cfnOutputs = { ...clusterCfnOutputs, ...argoDbCfnOutputs };
  validateKeys(cfnOutputs);

  new PriorityClasses(app, 'priority-classes');

  const coredns = new CoreDns(app, 'dns', {});

  // Node localDNS is very expermential in this cluster, it can and will break DNS resolution
  // If there are any issues with DNS, NodeLocalDNS should be disabled first.
  if (UseNodeLocalDns) {
    const ipv6Cidr = clusterConfig.kubernetesNetworkConfig?.serviceIpv6Cidr;
    if (ipv6Cidr == null) throw new Error('Unable to use node-local-dns without ipv6Cidr');
    const nodeLocal = new NodeLocalDns(app, 'node-local-dns', { serviceIpv6Cidr: ipv6Cidr });
    nodeLocal.addDependency(coredns);
  }

  const fluentbit = new FluentBit(app, 'fluentbit', {
    saName: cfnOutputs[CfnOutputKeys.FluentBitServiceAccountName],
    clusterName: ClusterName,
  });
  fluentbit.addDependency(coredns);

  const karpenter = new Karpenter(app, 'karpenter', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.ClusterEndpoint],
    saName: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.KarpenterDefaultInstanceProfile],
  });

  const karpenterNodePool = new KarpenterNodePool(app, 'karpenter-nodepool', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.ClusterEndpoint],
    saName: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.KarpenterDefaultInstanceProfile],
  });

  karpenterNodePool.addDependency(karpenter);

  new ArgoWorkflows(app, 'argo-workflows', {
    namespace: 'argo',
    clusterName: ClusterName,
    saName: cfnOutputs[CfnOutputKeys.ArgoRunnerServiceAccountName],
    tempBucketName: ScratchBucketName,
    argoDbEndpoint: cfnOutputs[CfnOutputKeys.ArgoDbEndpoint],
    argoDbPassword: ssmConfig.argoDbPassword,
  });

  new ArgoExtras(app, 'argo-extras', {
    namespace: 'argo',
    /** Argo workflows interacts with github give it access to github bot user*/
    secrets: [{ name: 'github-linz-li-bot-pat', data: { pat: ssmConfig.githubPat } }],
  });

  new ArgoSecretsChart(app, 'argo-secrets', {
    accountIdHydro: ssmConfig.s3BatchRestoreAccountIdHydro,
    accountIdTopo: ssmConfig.s3BatchRestoreAccountIdTopo,
    s3BatchRestoreRoleArn: ssmConfig.s3BatchRestoreRoleArn,
  });

  new Cloudflared(app, 'cloudflared', {
    namespace: 'cloudflared',
    tunnelId: ssmConfig.cloudflaredTunnelId,
    tunnelSecret: ssmConfig.cloudflaredTunnelSecret,
    tunnelName: ssmConfig.cloudflaredTunnelName,
    accountId: ssmConfig.cloudflaredAccountId,
  });

  new EventExporter(app, 'event-exporter', { namespace: 'event-exporter' });

  app.synth();
}

void main();
