import { applyTags, SecurityClassification } from '@linzjs/cdk-tags';
import { App } from 'aws-cdk-lib';

import { ArgoDbInstanceName, ArgoEventsSQSName, ClusterName, DefaultRegion } from './constants.ts';
import { tryGetContextArns } from './eks/arn.ts';
import { LinzEksCluster } from './eks/cluster.ts';
import { ArgoDatabase } from './rds/argo.db.ts';
import { ArgoEventsSQS } from './sqs/argo.events.sqs.ts';
import { fetchSsmParameters } from './util/ssm.ts';

const app = new App();

async function main(): Promise<void> {
  const accountId = (app.node.tryGetContext('aws-account-id') as unknown) ?? process.env['CDK_DEFAULT_ACCOUNT'];
  const maintainerRoleArns = tryGetContextArns(app.node, 'maintainer-arns');
  const rdsAlertsCtx = (app.node.tryGetContext('rds-alerts') as string | undefined) ?? 'false';
  let rdsAlerts: boolean = false;
  if (rdsAlertsCtx.toLowerCase() === 'true') {
    rdsAlerts = true;
  } else if (rdsAlertsCtx.toLowerCase() !== 'false') {
    throw new Error('Invalid context value for rds-alerts, must be string "true" or "false"');
  }
  if (maintainerRoleArns.length === 0) {
    console.warn(
      `Warning: No maintainer role ARNs specified in context maintainer-arns. Must be provided to deploy ${ClusterName}.`,
    );
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

  /* Add an SQS Queue for receiving parameter file creation events from the Argo Workflows Scratch Bucket.*/
  const argoEventsSQSStack = new ArgoEventsSQS(app, ArgoEventsSQSName, {
    env: { region: DefaultRegion, account: accountId },
  });

  const cluster = new LinzEksCluster(app, ClusterName, {
    env: { region: DefaultRegion, account: accountId },
    maintainerRoleArns,
    s3BatchRestoreRoleArn: ssmConfig.s3BatchRestoreRoleArn,
  });

  cluster.addDependency(argoDbStack);
  cluster.addDependency(argoEventsSQSStack);

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
