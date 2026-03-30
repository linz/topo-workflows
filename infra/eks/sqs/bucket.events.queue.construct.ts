import { Duration } from 'aws-cdk-lib';
import { SubscriptionFilter, Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface BucketEventSource {
  arn: string;
  filter: SubscriptionFilter;
}

interface BucketEventsQueueProps {
  sources: BucketEventSource[];
  queueName?: string;
}

export class BucketEventsQueue extends Construct {
  public readonly queue: Queue;

  constructor(scope: Construct, id: string, props: BucketEventsQueueProps) {
    super(scope, id);

    this.queue = new Queue(this, 'Queue', {
      queueName: props.queueName ?? 'bucket-events',
      visibilityTimeout: Duration.seconds(30),
      retentionPeriod: Duration.days(7),
    });

    for (const source of props.sources) {
      const topicName = source.arn.split(':').at(-1);

      const topic = Topic.fromTopicArn(this, `Topic-${topicName}`, source.arn);

      topic.addSubscription(
        new SqsSubscription(this.queue, {
          filterPolicy: { key: source.filter },
        }),
      );
    }
  }
}
