import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';

export class ArgoRdsStack extends Stack {
  db: rds.DatabaseInstance;
  vpc: ec2.IVpc;
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);
    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    this.db = new rds.DatabaseInstance(this, 'ArgoDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      publiclyAccessible: false, // will default to false in a non-public VPC
      allocatedStorage: 10,
      maxAllocatedStorage: 40,
      // masterUsername: 'admin',
      // masterUserPassword: cdk.SecretValue.plainText('password'),
      // password rotation will automatically be 30 days, we may want to override this
      credentials: rds.Credentials.fromGeneratedSecret('argodbuser'), // Cannot use IAM with Argo?
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY, // setting for nonprod
      storageEncrypted: false, // default is false with no key, noted here as something we might want
      multiAz: false, // default is false, noted in as something we might want
      enablePerformanceInsights: false, // default is false, noted in as something we might want
      // Configure CloudWatch options?
    });
  }
}
