import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';
import { ArgoWorkflows } from './charts/argo.workflows';
import { FluentBit } from './charts/fluentbit';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter';
import { CoreDns } from './charts/kube-system.coredns';
import { CfnOutputKeys, ClusterName } from './constants';
import { getCfnOutputs } from './util/cloud.formation';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs(ClusterName);
  //FIXME: is there a better way to do that?
  const missingKeys = [
    ...Object.values(CfnOutputKeys.Karpenter),
    ...Object.values(CfnOutputKeys.FluentBit),
    ...Object.values(CfnOutputKeys.Argo),
  ].filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }

  new ArgoSemaphore(app, 'semaphore', {});
  const coredns = new CoreDns(app, 'dns', {});
  const fluentbit = new FluentBit(app, 'fluentbit', {
    saRoleName: cfnOutputs[CfnOutputKeys.FluentBit.ServiceAccountName],
    clusterName: ClusterName,
  });
  fluentbit.addDependency(coredns);

  const karpenter = new Karpenter(app, 'karpenter', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  const karpenterProvisioner = new KarpenterProvisioner(app, 'karpenter-provisioner', {
    clusterName: ClusterName,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  karpenterProvisioner.addDependency(karpenter);

  new ArgoWorkflows(app, 'argo-workflows', {
    clusterName: ClusterName,
    saName: cfnOutputs[CfnOutputKeys.Argo.RunnerServiceAccountName],
    tempBucketName: cfnOutputs[CfnOutputKeys.Argo.TempBucketName],
  });

  app.synth();
}

main();
