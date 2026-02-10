import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys, ScratchBucketName } from '../constants.ts';

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

    this.argoEventsSqs.grantSendMessages(
      new ServicePrincipal('s3.amazonaws.com', {
        conditions: {
          ArnLike: { 'aws:SourceArn': Bucket.fromBucketName(this, 'Scratch', ScratchBucketName).bucketArn },
        },
      }),
    );

    new CfnOutput(this, CfnOutputKeys.ArgoEventsSQSArn, {
      value: this.argoEventsSqs.queueArn,
      exportName: CfnOutputKeys.ArgoEventsSQSArn,
    });
  }
}
