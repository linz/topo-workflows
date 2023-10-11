import { Chart, ChartProps } from 'cdk8s';
import { Namespace } from 'cdk8s-plus-27';
import { Construct } from 'constructs';
import { applyDefaultLabels } from '../util/labels';


export class NamespaceChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'namespace', '1.0.0', 'namespace', 'workflows'));

    new Namespace(this, 'namespace', { metadata: { name: props.namespace } });
  }
}