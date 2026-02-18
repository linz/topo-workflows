import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys, ScratchBucketName } from '../constants.ts';

export class SqsQueues extends Stack {
  /** SQS Queue for Argo Events to use to receive file creation events from Argo Workflows scratch bucket */
  scratchCopyOdrSqsQueue: Queue;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const scratchBucket = Bucket.fromBucketAttributes(this, 'ScratchBucket', {
      bucketName: ScratchBucketName,
    });

    this.scratchCopyOdrSqsQueue = new Queue(this, `${ScratchBucketName}-copy-odr-queue`, {
      visibilityTimeout: Duration.seconds(30),
      queueName: `${ScratchBucketName}-copy-odr-queue`,
    });
    this.scratchCopyOdrSqsQueue.applyRemovalPolicy(RemovalPolicy.RETAIN);
    this.scratchCopyOdrSqsQueue.grantSendMessages(
      new ServicePrincipal('s3.amazonaws.com', {
        conditions: {
          ArnLike: { 'aws:SourceArn': scratchBucket.bucketArn },
        },
      }),
    );

    scratchBucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(this.scratchCopyOdrSqsQueue), {
      prefix: 'copy-odr/',
      suffix: 'copy-config.json',
    });

    new CfnOutput(this, CfnOutputKeys.ScratchCopyOdrSqsQueueArn, {
      value: this.scratchCopyOdrSqsQueue.queueArn,
      exportName: CfnOutputKeys.ScratchCopyOdrSqsQueueArn,
    });
  }
}
