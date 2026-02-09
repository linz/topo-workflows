import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';

import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';

import { ArgoEventsSQSName, CfnOutputKeys } from '../constants.ts';

export class ArgoEventsSQS extends Stack {
  argoEventsSqs: Queue;
  constructor(scope: Construct, id: string, props: {}) {
    super(scope, id, props);

    this.argoEventsSqs = new Queue(this, ArgoEventsSQSName, {
      visibilityTimeout: Duration.seconds(30),
      queueName: ArgoEventsSQSName,
    });
    this.argoEventsSqs.applyRemovalPolicy(RemovalPolicy.RETAIN);
    new CfnOutput(this, CfnOutputKeys.ArgoEventsSQSArn, {
      value: this.argoEventsSqs.queueArn,
      exportName: CfnOutputKeys.ArgoEventsSQSArn,
    });
  }
}
