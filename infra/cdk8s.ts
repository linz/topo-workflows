import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';
import { ArgoWorkflows } from './charts/argo.workflows';
import { Cloudflared } from './charts/cloudflared';
import { FluentBit } from './charts/fluentbit';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter';
import { CoreDns } from './charts/kube-system.coredns';
import { CfnOutputKeys, ClusterName } from './constants';
import { getCfnOutputs } from './util/cloud.formation';
import { fetchSsmParameters } from './util/ssm';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs(ClusterName);
  const missingKeys = [
    ...Object.values(CfnOutputKeys.Karpenter),
    ...Object.values(CfnOutputKeys.FluentBit),
    ...Object.values(CfnOutputKeys.Argo),
  ].filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }

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
    saName: cfnOutputs[CfnOutputKeys.FluentBit.ServiceAccountName],
    clusterName: ClusterName,
  });
  fluentbit.addDependency(coredns);

  const karpenter = new Karpenter(app, 'karpenter', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  const karpenterProvisioner = new KarpenterProvisioner(app, 'karpenter-provisioner', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  karpenterProvisioner.addDependency(karpenter);

  new ArgoWorkflows(app, 'argo-workflows', {
    clusterName: ClusterName,
    saName: cfnOutputs[CfnOutputKeys.Argo.RunnerServiceAccountName],
    tempBucketName: cfnOutputs[CfnOutputKeys.Argo.TempBucketName],
  });

  new Cloudflared(app, 'cloudflared', {
    tunnelId: ssmConfig.tunnelId,
    tunnelSecret: ssmConfig.tunnelSecret,
    tunnelName: ssmConfig.tunnelName,
    accountId: ssmConfig.accountId,
  });

  app.synth();
}

main();
