import { App } from 'aws-cdk-lib';

import { ClusterName } from './constants.js';
import { tryGetContextArn } from './eks/arn.js';
import { LinzEksCluster } from './eks/cluster.js';

const app = new App();

async function main(): Promise<void> {
  const accountId = app.node.tryGetContext('aws-account-id') ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerArns = tryGetContextArns(app.node, 'maintainer-arns');

  if (maintainerArns == null) throw new Error('Missing context: maintainer-arns');
  if (accountId == null) {
    throw new Error("Missing AWS Account information, set with either '-c aws-account-id' or $CDK_DEFAULT_ACCOUNT");
  }

  new LinzEksCluster(app, ClusterName, {
    env: { region: 'ap-southeast-2', account: accountId },
    maintainerRoleArns: maintainerArns,
  });

  app.synth();
}

main();
