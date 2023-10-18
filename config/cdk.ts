import { App } from 'aws-cdk-lib';

import { LinzEksCluster } from './eks/cluster';

const app = new App();

async function main(): Promise<void> {
  new LinzEksCluster(app, 'Workflows', { env: { region: 'ap-southeast-2', account: process.env.AWS_ACCOUNT_ID } });

  app.synth();
}

main();
