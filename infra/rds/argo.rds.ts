import { App, CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {
  // CfnDBSecurityGroupIngress,
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
  // ParameterGroup,
  PostgresEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

import { CfnOutputKeysArgoDb } from '../constants.js';

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
  /** Argo needs a secret to use for the RDS database */
  // FIXME:
  argoDbSecret: Secret;

  constructor(scope: App, id: string, props: ArgoRdsProps & StackProps) {
    super(scope, id, props);
    const eksSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'ArgoSG', props.clusterSecurityGroupId, {});

    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    // this.argoDbSecret = new Secret(this, 'Secret', {
    //   secretName: 'argodbsecret',
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: 'argodbuser',
    //     }),
    //     generateStringKey: 'password',
    //   },
    // });

    this.argoDbSecret = new DatabaseSecret(this, 'ArgoDbSecret', {
      username: 'argodbuser',
    });

    // example of using parameters separately
    // const argoDbParameterGroup = new ParameterGroup(this, 'ParameterGroup', {
    //   engine: DatabaseInstanceEngine.postgres({
    //     version: PostgresEngineVersion.VER_15_3,
    //   }),
    //   parameters: {
    //     locks: '100',
    //   },
    // });

    this.argoDb = new DatabaseInstance(this, 'ArgoDbAF', {
      // TODO: need to add Security Group rule to allow traffic from Argo to RDS on port 5432
      // database encryption is on by default, can be changed using rds.force_ssl=0 in a parameterGroup
      engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_15_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      publiclyAccessible: false,
      allocatedStorage: 10, // TODO decide
      maxAllocatedStorage: 40, // TODO decide
      // TODO: decide on method to add DB secret to K8s from AWS Secrets Manager
      credentials: Credentials.fromSecret(this.argoDbSecret),
      // credentials: Credentials.fromGeneratedSecret('argodbuser'),
      deletionProtection: false, // setting for nonprod
      removalPolicy: RemovalPolicy.DESTROY, // setting for nonprod
      storageEncrypted: false, // default is false with no key, noted here as something we might want
      multiAz: false, // default is false, noted in as something we might want
      enablePerformanceInsights: false, // default is false, noted in as something we might want
      // Configure CloudWatch options?
    });

    this.argoDb.connections.allowTo(eksSG, ec2.Port.tcp(5432), 'EKS to Argo Database');

    new CfnOutput(this, CfnOutputKeysArgoDb.ArgoDbEndpoint, { value: this.argoDb.dbInstanceEndpointAddress });
    new CfnOutput(this, CfnOutputKeysArgoDb.ArgoDbSecretName, { value: this.argoDbSecret.secretName });
  }
}
