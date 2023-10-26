import { App } from 'aws-cdk-lib';

import { ClusterName } from './constants';
import { LinzEksCluster } from './eks/cluster';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, ClusterName, {
    env: { region: 'ap-southeast-2', account: process.env.CDK_DEFAULT_ACCOUNT },
  });

  app.synth();
}

main();
