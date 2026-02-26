import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { SubscriptionFilter, Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { CfnOutputKeys } from '../constants.ts';

const StacFilter = SubscriptionFilter.stringFilter({
  matchSuffixes: ['collection.json', 'catalog.json'],
});

const BucketEvents = [
  { arn: 'arn:aws:sns:ap-southeast-2:838278294040:nz-imagery-object_created', filter: StacFilter },
  { arn: 'arn:aws:sns:ap-southeast-2:838278294040:nz-topography-object_created', filter: StacFilter },
];

export class SqsQueues extends Stack {
  /** SQS Queue for Argo Events to use to receive file creation events from public sources */
  objectCreated: Queue;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.objectCreated = new Queue(this, `object-created-events`, {
      visibilityTimeout: Duration.seconds(30),
      retentionPeriod: Duration.days(7),
      queueName: `object-created-events`,
    });

    for (const source of BucketEvents) {
      const topic = Topic.fromTopicArn(this, `topic-${source.arn.split(':').at(-1)}`, source.arn);
      topic.addSubscription(new SqsSubscription(this.objectCreated, { filterPolicy: { key: source.filter } }));
    }

    new CfnOutput(this, CfnOutputKeys.ObjectCreatedSqsQueueArn, {
      value: this.objectCreated.queueArn,
      exportName: CfnOutputKeys.ObjectCreatedSqsQueueArn,
    });
  }
}
