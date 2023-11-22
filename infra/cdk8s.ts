import { App } from 'cdk8s';

import { ArgoExtras } from './charts/argo.extras.js';
import { ArgoWorkflows } from './charts/argo.workflows.js';
import { Cloudflared } from './charts/cloudflared.js';
import { EventExporter } from './charts/event.exporter.js';
import { FluentBit } from './charts/fluentbit.js';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter.js';
import { CoreDns } from './charts/kube-system.coredns.js';
import { CfnOutputKeys, ClusterName, ScratchBucketName, validateKeys } from './constants.js';
import { getCfnOutputs } from './util/cloud.formation.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs(ClusterName);
  validateKeys(cfnOutputs);

  const ssmConfig = await fetchSsmParameters({
    // Config for Cloudflared to access argo-server
    tunnelId: '/eks/cloudflared/argo/tunnelId',
    tunnelSecret: '/eks/cloudflared/argo/tunnelSecret',
    tunnelName: '/eks/cloudflared/argo/tunnelName',
    accountId: '/eks/cloudflared/argo/accountId',

    // Personal access token to gain access to linz-basemaps github user
    githubPat: '/eks/github/linz-basemaps/pat',

    // Argo Database connection password
    argoDbPassword: '/eks/argo/postgres/password',
  });

  const coredns = new CoreDns(app, 'dns', {});
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

  const karpenterProvisioner = new KarpenterProvisioner(app, 'karpenter-provisioner', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.ClusterEndpoint],
    saName: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.KarpenterServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.KarpenterDefaultInstanceProfile],
  });

  karpenterProvisioner.addDependency(karpenter);

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
    secrets: [{ name: 'github-linz-basemaps-pat', data: { pat: ssmConfig.githubPat } }],
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

main();
