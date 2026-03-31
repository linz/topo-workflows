import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';

import { BucketEventSource } from './bucket.events.queue.construct.ts';

const stacFilter = SubscriptionFilter.stringFilter({
  matchSuffixes: ['collection.json', 'catalog.json'],
});

export const ObjectCreatedSources: BucketEventSource[] = [
  {
    arn: 'arn:aws:sns:ap-southeast-2:838278294040:nz-imagery-object_created',
    filter: stacFilter,
  },
  {
    arn: 'arn:aws:sns:ap-southeast-2:838278294040:nz-elevation-object_created',
    filter: stacFilter,
  },
  {
    arn: 'arn:aws:sns:ap-southeast-2:838278294040:nz-coastal-object_created',
    filter: stacFilter,
  },
  {
    arn: 'arn:aws:sns:ap-southeast-2:413910103162:linz-basemaps-object_created',
    filter: SubscriptionFilter.stringFilter({ matchPrefixes: ['config/'] }),
  },
];
