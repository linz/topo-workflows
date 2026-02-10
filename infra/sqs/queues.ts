import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys, ScratchBucketName } from '../constants.ts';

export class SqsQueues extends Stack {
  /** SQS Queue for Argo Events to use to receive file creation events from Argo Workflows scratch bucket */
  scratchPublishSqsQueue: Queue;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.scratchPublishSqsQueue = new Queue(this, id, {
      visibilityTimeout: Duration.seconds(30),
      queueName: `${ScratchBucketName}-publish-queue`,
    });
    this.scratchPublishSqsQueue.applyRemovalPolicy(RemovalPolicy.RETAIN);
    this.scratchPublishSqsQueue.grantSendMessages(
      new ServicePrincipal('s3.amazonaws.com', {
        conditions: {
          ArnLike: { 'aws:SourceArn': Bucket.fromBucketName(this, 'Scratch', ScratchBucketName).bucketArn },
        },
      }),
    );

    new CfnOutput(this, CfnOutputKeys.ScratchPublishSqsQueueArn, {
      value: this.scratchPublishSqsQueue.queueArn,
      exportName: CfnOutputKeys.ScratchPublishSqsQueueArn,
    });
  }
}
