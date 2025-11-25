import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface ArgoEventsProps {}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/221f4d5e837b87c6c54cbcb14a88b5cf4bbf7446/charts/argo-events/Chart.yaml#L5
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '2.4.17';

/**
 * This is the version of Argo Events for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/221f4d5e837b87c6c54cbcb14a88b5cf4bbf7446/charts/argo-events/Chart.yaml#L2
 *
 */
const appVersion = 'v1.9.8';

export class ArgoEvents extends Chart {
  constructor(scope: Construct, id: string, props: ArgoEventsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-events', appVersion, 'logs', 'events'));

    new Helm(this, 'argo-events', {
      chart: 'argo-events',
      releaseName: 'argo-events',
      repo: 'https://argoproj.github.io/argo-helm',
      namespace: 'argo-events',
      version: chartVersion,
      values: {},
    });
  }
}
