import { Chart, ChartProps } from 'cdk8s';
import * as kplus from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/**
 * Configuration for the workflows themselves trying to keep this a little seperate from the argo server setup
 */
export class ArgoExtras extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: ChartProps & { secrets: { name: string; data: Record<string, string> }[] },
  ) {
    super(scope, id, applyDefaultLabels(props, 'argo', 'v1', 'semaphores', 'workflows'));

    new kplus.ConfigMap(this, 'semaphores', {
      metadata: { name: 'semaphores' },
      data: {
        standardising: '2', // Limit of how many standardising workflow instances can run at the same time
        bulk: '4', // Limit of how many bulk workflow instances can run at the same time
        bulkcopy: '8', // Limit of how many publish-copy workflow instances can run at the same time
        basemaps_import: '10', // Limit of how many basemaps import workflow instances can run at the same time
      },
    });

    for (const s of props.secrets) {
      const secret = new kplus.Secret(this, 'secret-' + s.name, { metadata: { name: s.name } });
      for (const [key, value] of Object.entries(s.data)) {
        secret.addStringData(key, value);
      }
    }
  }
}
