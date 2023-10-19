import { App } from 'cdk8s';

import { CLUSTER_NAME } from './cdk';
import { CfnOutputKeys } from './cfn.output';
import { ArgoSemaphore } from './charts/argo.semaphores';
import { Karpenter } from './charts/karpenter';
import { getCfnOutputs } from './util/cloud.formation';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs(CLUSTER_NAME);
  // FIXME: loop over `CfnOutputKeys.Karpenter` instead
  if (
    !(CfnOutputKeys.Karpenter.ClusterEndpoint in cfnOutputs) ||
    !(CfnOutputKeys.Karpenter.ServiceAccountRoleArn in cfnOutputs) ||
    !(CfnOutputKeys.Karpenter.DefaultInstanceProfile in cfnOutputs)
  ) {
    throw new Error(`At least one CloudFormation Output is missing: {cfnOutputs}`);
  }
  new ArgoSemaphore(app, 'semaphore', {});

  new Karpenter(app, 'karpenter', {
    clusterName: CLUSTER_NAME,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    roleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  app.synth();
}

main();
