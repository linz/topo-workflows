import { applyTags, SecurityClassification } from '@linzjs/cdk-tags';
import { App } from 'aws-cdk-lib';

import { ClusterName, DefaultRegion } from './constants.ts';
import { tryGetContextArns } from './eks/arn.ts';
import { LinzEksCluster } from './eks/cluster.ts';
import { fetchSsmParameters } from './util/ssm.ts';

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

  const cluster = new LinzEksCluster(app, ClusterName, {
    env: { region: DefaultRegion, account: accountId },
    maintainerRoleArns,
    slackChannelConfigurationName: ssmConfig.slackChannelConfigurationName,
    slackWorkspaceId: ssmConfig.slackWorkspaceId,
    slackChannelId: ssmConfig.slackChannelId,
    s3BatchRestoreRoleArn: ssmConfig.s3BatchRestoreRoleArn,
  });

  applyTags(cluster, {
    application: 'argo',
    environment: process.env['NODE_ENV'] === 'production' ? 'prod' : 'nonprod',
    group: 'li',
    impact: 'moderate',
    classification: SecurityClassification.Unclassified,
    responderTeam: 'LI - Geospatial Data Engineering',
  });

  app.synth();
}

void main();
