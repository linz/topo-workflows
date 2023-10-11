import { Chart, ChartProps } from 'cdk8s';
import * as kplus from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels';

export class ArgoSemaphore extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo', 'v1', 'semaphores', 'workflows'));

    new kplus.ConfigMap(this, 'semaphores', {
      data: {
        standardising: '2', // Limit of how many standardising workflow instances can run at the same time
        bulk: '4', // Limit of how many bulk workflow instances can run at the same time
        bulkcopy: '8', // Limit of how many publish-copy workflow instances can run at the same time
        basemaps_import: '10', // Limit of how many basemaps import workflow instances can run at the same time
      },
    });
  }
}
