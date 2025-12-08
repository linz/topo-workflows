import { CfnOutput, Duration, RemovalPolicy, SecretValue, Size, Stack, StackProps } from 'aws-cdk-lib';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { InstanceClass, InstanceSize, InstanceType, IVpc, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

import { ArgoDbInstanceName, ArgoDbName, ArgoDbUser, CfnOutputKeys } from '../constants.js';

interface ArgoDatabaseProps extends StackProps {
  /** Whether to enable Slack alerts for the database */
  alerts: boolean;
  /** Slack channel configuration for RDS alerts */
  slackChannelConfigurationName: string;
  /** Slack workspace ID for RDS alerts */
  slackWorkspaceId: string;
  /** Slack channel ID for RDS alerts */
  slackChannelId: string;
}

export class ArgoDatabase extends Stack {
  argoDb: DatabaseInstance;
  vpc: IVpc;
  constructor(scope: Construct, id: string, props: ArgoDatabaseProps) {
    super(scope, id, props);

    this.vpc = Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    const dbSecurityGroup = new SecurityGroup(this, 'ArgoDbSG', {
      vpc: this.vpc,
      description: 'Security Group for Argo RDS',
      allowAllOutbound: true,
    });

    // TODO: setup up a database CNAME for changing Argo DB without updating Argo config
    // TODO: run a Disaster Recovery test to recover database data
    this.argoDb = new DatabaseInstance(this, ArgoDbInstanceName, {
      engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_15_12 }),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
      vpc: this.vpc,
      securityGroups: [dbSecurityGroup],
      databaseName: ArgoDbName,
      credentials: Credentials.fromPassword(ArgoDbUser, SecretValue.ssmSecure('/eks/argo/postgres/password')),
      storageEncrypted: false,
      publiclyAccessible: false,
      allocatedStorage: 10,
      maxAllocatedStorage: 40,
      multiAz: true,
      enablePerformanceInsights: true,
      deletionProtection: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      backupRetention: Duration.days(35),
      deleteAutomatedBackups: false,
    });

    new CfnOutput(this, CfnOutputKeys.ArgoDbSecurityGroupId, {
      value: dbSecurityGroup.securityGroupId,
      exportName: CfnOutputKeys.ArgoDbSecurityGroupId,
    });

    new CfnOutput(this, CfnOutputKeys.ArgoDbEndpoint, {
      value: this.argoDb.dbInstanceEndpointAddress,
      exportName: CfnOutputKeys.ArgoDbEndpoint,
    });

    if (!props.alerts) return;
    // Set up CloudWatch alarms to Slack for RDS free disk space and CPU utilization
    const rdsTopic = new sns.Topic(this, 'RDSAlertsTopic', {
      displayName: 'RDS Slack Notification',
    });
    const slackChannel = new chatbot.SlackChannelConfiguration(this, 'AlertArgoWorkflowDev', {
      slackChannelConfigurationName: props.slackChannelConfigurationName,
      slackWorkspaceId: props.slackWorkspaceId,
      slackChannelId: props.slackChannelId,
    });
    slackChannel.addNotificationTopic(rdsTopic);
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.MetricOptions.html
    const alarmStorage = this.argoDb
      .metricFreeStorageSpace({ period: Duration.minutes(5) })
      .createAlarm(this, 'FreeStorageSpace', {
        threshold: Size.gibibytes(2).toBytes(),
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      });
    const alarmCpu = this.argoDb
      .metricCPUUtilization({ period: Duration.minutes(5) })
      .createAlarm(this, 'CPUUtilization', { threshold: 75, evaluationPeriods: 2 });
    alarmStorage.addAlarmAction(new actions.SnsAction(rdsTopic));
    alarmCpu.addAlarmAction(new actions.SnsAction(rdsTopic));
  }
}
