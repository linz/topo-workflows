import { App } from 'aws-cdk-lib';

import { LinzEksCluster } from './eks/cluster';

export const CLUSTER_NAME = 'Workflows';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, 'Workflows', { env: { region: 'ap-southeast-2', account: process.env.CDK_DEFAULT_ACCOUNT } });

  app.synth();
}

main();
