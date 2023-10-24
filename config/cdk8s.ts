import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';
import { FluentBit } from './charts/fluentbit';
import { Karpenter, KarpenterProvisioner } from './charts/karpenter';
import { CoreDns } from './charts/kube-system.coredns';
import { CLUSTER_NAME, CfnOutputKeys } from './constants';
import { getCfnOutputs } from './util/cloud.formation';

const app = new App();

async function main(): Promise<void> {
  // Get cloudformation outputs
  const cfnOutputs = await getCfnOutputs(CLUSTER_NAME);
  const missingKeys = [...Object.values(CfnOutputKeys.Karpenter)].filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }

  new ArgoSemaphore(app, 'semaphore', {});
  new FluentBit(app, 'fluentbit', {});
  new CoreDns(app, 'Dns', {});

  const karpenter = new Karpenter(app, 'karpenter', {
    clusterName: CLUSTER_NAME,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  const karpenterProvisioner = new KarpenterProvisioner(app, 'karpenter-provisioner', {
    clusterName: CLUSTER_NAME,
    clusterEndpoint: cfnOutputs[CfnOutputKeys.Karpenter.ClusterEndpoint],
    saRoleName: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountName],
    saRoleArn: cfnOutputs[CfnOutputKeys.Karpenter.ServiceAccountRoleArn],
    instanceProfile: cfnOutputs[CfnOutputKeys.Karpenter.DefaultInstanceProfile],
  });

  karpenterProvisioner.addDependency(karpenter);

  app.synth();
}

main();
