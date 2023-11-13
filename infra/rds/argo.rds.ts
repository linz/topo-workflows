import { App, CfnOutput, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
  PostgresEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

import { ArgoDbUser, CfnOutputKeysArgoDb, DbUsername } from '../constants.js';

export interface ArgoRdsProps {
  /**
   * ID of the EKS cluster Security Group
   *
   * @example "EksWorkflows7AAB122A"
   */
  clusterSecurityGroupId: string;
}

export class ArgoRdsStack extends Stack {
  vpc: ec2.IVpc;
  /** Argo needs a database for workflow archive */
  argoDb: DatabaseInstance;

  constructor(scope: App, id: string, props: ArgoRdsProps & StackProps) {
    super(scope, id, props);
    const eksSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'ArgoSG', props.clusterSecurityGroupId, {});

    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    this.argoDb = new DatabaseInstance(this, 'ArgoDbAF', {
      engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_15_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      publiclyAccessible: false,
      allocatedStorage: 10, // TODO decide
      maxAllocatedStorage: 40, // TODO decide
      // TODO: decide on method to add DB secret to K8s from AWS Secrets Manager
      credentials: Credentials.fromPassword(ArgoDbUser, SecretValue.ssmSecure('/eks/argo/postgres/password')),
      deletionProtection: false, // setting for nonprod
      removalPolicy: RemovalPolicy.DESTROY, // setting for nonprod
      storageEncrypted: false, // default is false with no key, noted here as something we might want
      multiAz: false, // default is false, noted in as something we might want
      enablePerformanceInsights: true, // default is false, noted in as something we might want
    });

    this.argoDb.connections.allowFrom(eksSG, ec2.Port.tcp(5432), 'EKS to Argo Database');

    new CfnOutput(this, CfnOutputKeysArgoDb.ArgoDbEndpoint, { value: this.argoDb.dbInstanceEndpointAddress });
  }
}
