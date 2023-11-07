import { App } from 'aws-cdk-lib';

import { ArgoDbName, ClusterName } from './constants.js';
import { LinzEksCluster } from './eks/cluster.js';
import { ArgoRdsStack } from './rds/argo.rds.js';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, ClusterName, {
    env: { region: 'ap-southeast-2', account: process.env['CDK_DEFAULT_ACCOUNT'] },
  });
  new ArgoRdsStack(app, ArgoDbName, {
    env: { region: 'ap-southeast-2', account: process.env['CDK_DEFAULT_ACCOUNT'] },
  });

  app.synth();
}

main();
