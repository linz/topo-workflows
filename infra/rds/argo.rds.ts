import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

import { CfnOutputKeys, DbName } from './../constants.js';

/*
TODO:
What repository should the RDS deployment be in?
Get the generated secret and add it to EKS for Argo to use during installation.
Add the EKS security group for the EKS cluster to be able to access the database port (otherwise connection times out and Argo fails to start).
Configure Argo Helm chart to get the secret without hard coding it?
Database configuration decisions e.g. replication, scaling.
*/

export class ArgoRdsStack extends Stack {
  db: rds.DatabaseInstance;
  vpc: ec2.IVpc;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });
    this.db = new rds.DatabaseInstance(this, DbName, {
      // database encryption is on by default, can be changed using rds.force_ssl=0 in a parameterGroup
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      publiclyAccessible: false, // will default to false in a non-public VPC
      allocatedStorage: 10,
      maxAllocatedStorage: 40,
      credentials: rds.Credentials.fromGeneratedSecret('argodbuser'), // Cannot use IAM with Argo?
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY, // setting for nonprod
      storageEncrypted: false, // default is false with no key, noted here as something we might want
      multiAz: false, // default is false, noted in as something we might want
      enablePerformanceInsights: false, // default is false, noted in as something we might want
      // Configure CloudWatch options?
    });
    new CfnOutput(this, CfnOutputKeys.ArgoDbEndpoint, { value: this.db.dbInstanceEndpointAddress });
  }
}
