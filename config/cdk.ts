import { App } from 'aws-cdk-lib';

import { CLUSTER_NAME } from './constants';
import { LinzEksCluster } from './eks/cluster';

import { ArgoRdsStack } from './rds/argo.rds.js';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, CLUSTER_NAME, {
    env: { region: 'ap-southeast-2', account: process.env.CDK_DEFAULT_ACCOUNT },
  });
  new ArgoRdsStack(app, 'ArgoDbNonProd', { env: { region: 'ap-southeast-2', account: process.env.CDK_DEFAULT_ACCOUNT } });

  app.synth();
}

main();
