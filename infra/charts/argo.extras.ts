import { Chart, ChartProps } from 'cdk8s';
import * as kplus from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/**
 * Extra configuration for the workflows themselves
 *
 * With the goal that the [ArgoWorkflows](./argo.workflows.ts) chart is focused more on the server setup and
 * {@link ArgoExtras} to be focused on the workflows running
 *
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
        // Limit of how many standardising workflow instances can run at the same time
        standardising: '2',
        // Limit of how many bulk workflow instances can run at the same time
        bulk: '4',
        // Limit of how many publish-copy workflow instances can run at the same time
        bulkcopy: '8',
        // Limit of how many basemaps import workflow instances can run at the same time
        basemaps_import: '10',
      },
    });

    // Secrets used by the workflows
    for (const s of props.secrets) {
      const secret = new kplus.Secret(this, 'secret-' + s.name, { metadata: { name: s.name } });
      for (const [key, value] of Object.entries(s.data)) {
        secret.addStringData(key, value);
      }
    }
  }
}
