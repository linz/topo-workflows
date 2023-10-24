import { App } from 'cdk8s';

import { CfnOutputKeys } from './cfn.output';
import { ArgoSemaphore } from './charts/argo.semaphores';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter';
import { CoreDns } from './charts/kube-system.coredns';
import { getCfnOutputs } from './util/cloud.formation';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs('Workflows');
  const missingKeys = [...Object.values(CfnOutputKeys.Karpenter)].filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }

  new ArgoSemaphore(app, 'semaphore', {});
  new CoreDns(app, 'Dns', {});

  const karpenter = new Karpenter(app, 'karpenter', {
    clusterName: 'Workflows',
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  const karpenterProvisioner = new KarpenterProvisioner(app, 'karpenter-provisioner', {
    clusterName: 'Workflows',
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  karpenterProvisioner.addDependency(karpenter);

  app.synth();
}

main();
