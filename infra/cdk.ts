import { App } from 'aws-cdk-lib';

import { ClusterName, DefaultRegion } from './constants.js';
import { tryGetContextArns } from './eks/arn.js';
import { LinzEksCluster } from './eks/cluster.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  const accountId = (app.node.tryGetContext('aws-account-id') as unknown) ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerRoleArns = tryGetContextArns(app.node, 'maintainer-arns');
  const ssmConfig = await fetchSsmParameters({
    slackChannelConfigurationName: '/rds/alerts/slack/channel/name',
    slackWorkspaceId: '/rds/alerts/slack/workspace/id',
    slackChannelId: '/rds/alerts/slack/channel/id',
    s3BatchRestoreRoleArn: '/eks/S3BatchRestore/roleArn',
  });

  if (maintainerRoleArns == null) throw new Error('Missing context: maintainer-arns');
  if (typeof accountId !== 'string') {
    throw new Error("Missing AWS Account information, set with either '-c aws-account-id' or $CDK_DEFAULT_ACCOUNT");
  }

  new LinzEksCluster(app, ClusterName, {
    env: { region: DefaultRegion, account: accountId },
    maintainerRoleArns,
    slackChannelConfigurationName: ssmConfig.slackChannelConfigurationName,
    slackWorkspaceId: ssmConfig.slackWorkspaceId,
    slackChannelId: ssmConfig.slackChannelId,
    s3BatchRestoreRoleArn: ssmConfig.s3BatchRestoreRoleArn,
  });

  app.synth();
}

void main();
