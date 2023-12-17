import { App } from 'aws-cdk-lib';

import { ClusterName } from './constants.js';
import { tryGetContextArns } from './eks/arn.js';
import { LinzEksCluster } from './eks/cluster.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  const accountId = app.node.tryGetContext('aws-account-id') ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerRoleArns = tryGetContextArns(app.node, 'maintainer-arns');
  const slackSsmConfig = await fetchSsmParameters({
    slackChannelConfigurationName: '/rds/alerts/slack/channel/name',
    slackWorkspaceId: '/rds/alerts/slack/workspace/id',
    slackChannelId: '/rds/alerts/slack/channel/id',
  });

  if (maintainerRoleArns == null) throw new Error('Missing context: maintainer-arns');
  if (accountId == null) {
    throw new Error("Missing AWS Account information, set with either '-c aws-account-id' or $CDK_DEFAULT_ACCOUNT");
  }

  new LinzEksCluster(app, ClusterName, {
    env: { region: 'ap-southeast-2', account: accountId },
    maintainerRoleArns,
    slackChannelConfigurationName: slackSsmConfig.slackChannelConfigurationName,
    slackWorkspaceId: slackSsmConfig.slackWorkspaceId,
    slackChannelId: slackSsmConfig.slackChannelId,
  });

  app.synth();
}

main();
