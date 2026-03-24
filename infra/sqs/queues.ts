import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export function createScratchPublishQueue(scope: Construct, scratchBucketName: string): Queue {
  const queue = new Queue(scope, `${scratchBucketName}-publish-queue`, {
    queueName: `${scratchBucketName}-publish-queue`,
    visibilityTimeout: Duration.seconds(30),
  });
  queue.applyRemovalPolicy(RemovalPolicy.RETAIN);

  const bucket = Bucket.fromBucketAttributes(scope, 'ScratchBucket', {
    bucketName: scratchBucketName,
  });

  // Grant S3 permission to send messages
  queue.grantSendMessages(
    new ServicePrincipal('s3.amazonaws.com', {
      conditions: { ArnLike: { 'aws:SourceArn': bucket.bucketArn } },
    }),
  );

  bucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(queue), {
    prefix: 'to-publish/',
    suffix: 'collection.json',
  });

  return queue;
}
