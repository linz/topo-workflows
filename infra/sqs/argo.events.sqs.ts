import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys, ScratchBucketName } from '../constants.ts';

export class ArgoEventsSQS extends Stack {
  argoEventsSqs: Queue;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.argoEventsSqs = new Queue(this, id, {
      visibilityTimeout: Duration.seconds(30),
      queueName: `${ScratchBucketName}-events`,
    });
    this.argoEventsSqs.applyRemovalPolicy(RemovalPolicy.RETAIN);
    new CfnOutput(this, CfnOutputKeys.ArgoEventsSQSArn, {
      value: this.argoEventsSqs.queueArn,
      exportName: CfnOutputKeys.ArgoEventsSQSArn,
    });
  }
}
