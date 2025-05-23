import { App } from 'aws-cdk-lib';

import { DefaultRegion, getClusterName } from './constants.js';
import { tryGetContextArns } from './eks/arn.js';
import { LinzEksCluster } from './eks/cluster.js';
import { fetchSsmParameters } from './util/ssm.js';

const app = new App();

async function main(): Promise<void> {
  const accountId = (app.node.tryGetContext('aws-account-id') as unknown) ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerRoleArns = tryGetContextArns(app.node, 'maintainer-arns') ?? [];
  const noDatabase = app.node.tryGetContext('no-database') === 'true';
  const clusterName = getClusterName(app.node.tryGetContext('cluster-suffix'));

  const slackSsmConfig = await fetchSsmParameters({
    slackChannelConfigurationName: '/rds/alerts/slack/channel/name',
    slackWorkspaceId: '/rds/alerts/slack/workspace/id',
    slackChannelId: '/rds/alerts/slack/channel/id',
  });

  if (typeof accountId !== 'string') {
    throw new Error(
      "Missing AWS Account information, set with either '--context=aws-account-id=123456789' or $CDK_DEFAULT_ACCOUNT",
    );
  }

  if (maintainerRoleArns.length === 0) console.log('No maintainer roles found');

  /** LINZ conventional name for Argo Workflows artifact bucket */
  const ScratchBucketName = `linz-${clusterName.toLowerCase()}-scratch`;

  new LinzEksCluster(app, clusterName, {
    env: { region: DefaultRegion, account: accountId },
    maintainerRoleArns,
    slack: {
      workspaceId: slackSsmConfig.slackWorkspaceId,
      channelId: slackSsmConfig.slackChannelId,
      channelConfigurationName: slackSsmConfig.slackChannelConfigurationName,
    },
    tempBucketName: ScratchBucketName,
    argoDatabaseName: noDatabase ? undefined : 'argo',
  });

  app.synth();
}

void main();
