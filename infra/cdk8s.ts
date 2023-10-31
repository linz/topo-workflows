import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores.js';
import { ArgoWorkflows } from './charts/argo.workflows.js';
import { Cloudflared } from './charts/cloudflared.js';
import { FluentBit } from './charts/fluentbit.js';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter.js';
import { CoreDns } from './charts/kube-system.coredns.js';
import { CfnOutputKeys, ClusterName, validateKeys } from './constants.js';
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
  });

  new ArgoSemaphore(app, 'semaphore', {});
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
    clusterName: ClusterName,
    saName: cfnOutputs[CfnOutputKeys.ArgoRunnerServiceAccountName],
    tempBucketName: cfnOutputs[CfnOutputKeys.TempBucketName],
  });

  new Cloudflared(app, 'cloudflared', {
    namespace: 'cloudflared',
    tunnelId: ssmConfig.tunnelId,
    tunnelSecret: ssmConfig.tunnelSecret,
    tunnelName: ssmConfig.tunnelName,
    accountId: ssmConfig.accountId,
  });

  app.synth();
}

main();
