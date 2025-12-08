import { applyTags, SecurityClassification } from '@linzjs/cdk-tags';
import { App } from 'aws-cdk-lib';

import { ArgoDbInstanceName, ClusterName, DefaultRegion } from './constants.ts';
import { tryGetContextArns } from './eks/arn.ts';
import { LinzEksCluster } from './eks/cluster.ts';
import { fetchSsmParameters } from './util/ssm.ts';
import { ArgoDatabase } from './eks/argo.db.ts';

const app = new App();

async function main(): Promise<void> {
  const accountId = (app.node.tryGetContext('aws-account-id') as unknown) ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerRoleArns = tryGetContextArns(app.node, 'maintainer-arns');
  const rdsAlerts = (app.node.tryGetContext('rds-alerts') as boolean) ?? false;
  if (maintainerRoleArns.length === 0) {
    console.warn(
      `Warning: No maintainer role ARNs specified in context maintainer-arns. Must be provided to deploy ${ClusterName}.`,
    );
  }
  if (typeof rdsAlerts !== 'boolean') {
    throw new Error('Invalid context value for rds-alerts, must be boolean (true|false)');
  }

  const ssmConfig = await fetchSsmParameters({
    slackChannelConfigurationName: '/rds/alerts/slack/channel/name',
    slackWorkspaceId: '/rds/alerts/slack/workspace/id',
    slackChannelId: '/rds/alerts/slack/channel/id',
    s3BatchRestoreRoleArn: '/eks/S3BatchRestore/roleArn',
  });

  if (typeof accountId !== 'string') {
    throw new Error("Missing AWS Account information, set with either '-c aws-account-id' or $CDK_DEFAULT_ACCOUNT");
  }

  const argoDbStack = new ArgoDatabase(app, ArgoDbInstanceName, {
    env: { region: DefaultRegion, account: accountId },
    alerts: rdsAlerts,
    slackChannelConfigurationName: ssmConfig.slackChannelConfigurationName,
    slackWorkspaceId: ssmConfig.slackWorkspaceId,
    slackChannelId: ssmConfig.slackChannelId,
  });

  const cluster = new LinzEksCluster(app, ClusterName, {
    env: { region: DefaultRegion, account: accountId },
    maintainerRoleArns,
    s3BatchRestoreRoleArn: ssmConfig.s3BatchRestoreRoleArn,
  });

  cluster.addDependency(argoDbStack);

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
