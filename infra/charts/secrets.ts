import { Chart, ChartProps } from 'cdk8s';
import * as k8s from 'cdk8s-plus-32';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export class Secret extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: ChartProps & { secrets: { name: string; data: Record<string, string> }[]; namespace: string },
  ) {
    super(scope, id, applyDefaultLabels(props, props.namespace, 'v1', 'secrets', 'manager'));

    for (const s of props.secrets) {
      const secret = new k8s.Secret(this, 'secret-' + s.name, {
        metadata: { name: s.name, namespace: props.namespace },
      });
      for (const [key, value] of Object.entries(s.data)) {
        secret.addStringData(key, value);
      }
    }
  }
}
