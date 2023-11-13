import { App } from 'aws-cdk-lib';

import { ArgoDbName, CfnOutputKeys, ClusterName, validateKeys } from './constants.js';
import { LinzEksCluster } from './eks/cluster.js';
import { ArgoRdsStack } from './rds/argo.rds.js';
import { getCfnOutputs } from './util/cloud.formation.js';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, ClusterName, {
    env: { region: 'ap-southeast-2', account: process.env['CDK_DEFAULT_ACCOUNT'] },
  });

  // Note: we only want to deploy the ArgoDb stack if the EKS Cluster exists
  try {
    const cfnOutputs = await getCfnOutputs(ClusterName);
    console.log(cfnOutputs);
    validateKeys(cfnOutputs);

    new ArgoRdsStack(app, ArgoDbName, {
      env: { region: 'ap-southeast-2', account: process.env['CDK_DEFAULT_ACCOUNT'] },
      clusterSecurityGroupId: cfnOutputs[CfnOutputKeys.ClusterSecurityGroupId],
    });
  } catch (err) {
    // TODO: what behaviour do we want here?
  }

  app.synth();
}

main();
