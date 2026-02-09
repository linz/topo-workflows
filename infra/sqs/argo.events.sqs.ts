import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys } from '../constants.ts';

interface ArgoEventsSQSProps extends StackProps {
  /** Whether to enable Slack alerts for the database */
  queueName: string;
}

export class ArgoEventsSQS extends Stack {
  argoEventsSqs: Queue;
  constructor(scope: Construct, id: string, props: ArgoEventsSQSProps) {
    super(scope, id, props);

    this.argoEventsSqs = new Queue(this, id, {
      visibilityTimeout: Duration.seconds(30),
      queueName: props.queueName,
    });
    this.argoEventsSqs.applyRemovalPolicy(RemovalPolicy.RETAIN);
    new CfnOutput(this, CfnOutputKeys.ArgoEventsSQSArn, {
      value: this.argoEventsSqs.queueArn,
      exportName: CfnOutputKeys.ArgoEventsSQSArn,
    });
  }
}
