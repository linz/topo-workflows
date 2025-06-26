import { App } from 'cdk8s';

import { ArgoExtras } from './charts/argo.extras.js';
import { ArgoWorkflows } from './charts/argo.workflows.js';
import { Cloudflared } from './charts/cloudflared.js';
import { EventExporter } from './charts/event.exporter.js';
import { FluentBit } from './charts/fluentbit.js';
import { Karpenter, KarpenterNodePool } from './charts/karpenter.js';
import { CoreDns } from './charts/kube-system.coredns.js';
import { NodeLocalDns } from './charts/kube-system.node.local.dns.js';
import { CfnOutputKeys, ClusterName, ScratchBucketName, UseNodeLocalDns, validateKeys } from './constants.js';
import { describeCluster, getCfnOutputs } from './util/cloud.formation.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const [cfnOutputs, ssmConfig, clusterConfig] = await Promise.all([
    getCfnOutputs(ClusterName),
    fetchSsmParameters({
      // Config for Cloudflared to access argo-server
      tunnelId: '/eks/cloudflared/argo/tunnelId',
      tunnelSecret: '/eks/cloudflared/argo/tunnelSecret',
      tunnelName: '/eks/cloudflared/argo/tunnelName',
      accountId: '/eks/cloudflared/argo/accountId',

      // Personal access token to gain access to linz-li-bot github user
      githubPat: '/eks/github/linz-li-bot/pat',

      // Argo Database connection password
      argoDbPassword: '/eks/argo/postgres/password',
    }),
    describeCluster(ClusterName),
  ]);
  validateKeys(cfnOutputs);

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

  new Cloudflared(app, 'cloudflared', {
    namespace: 'cloudflared',
    tunnelId: ssmConfig.tunnelId,
    tunnelSecret: ssmConfig.tunnelSecret,
    tunnelName: ssmConfig.tunnelName,
    accountId: ssmConfig.accountId,
  });

  new EventExporter(app, 'event-exporter', { namespace: 'event-exporter' });

  app.synth();
}

void main();
