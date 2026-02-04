import { Chart, ChartProps, Helm } from 'cdk8s';
import { Namespace } from 'cdk8s-plus-33';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface ArgoEventsProps {}

/**
 * This is the version of the Helm chart for Argo Events https://github.com/argoproj/argo-helm/blob/b8fc7466465c617f270256ded8d6c6d3d57ea524/charts/argo-events/Chart.yaml#L5C10-L5C16
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '2.4.20';

/**
 * This is the version of Argo Events for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/b8fc7466465c617f270256ded8d6c6d3d57ea524/charts/argo-events/Chart.yaml#L2
 *
 */
const appVersion = 'v1.9.10';

const namespace = 'argo-events';

export class ArgoEvents extends Chart {
  constructor(scope: Construct, id: string, props: ArgoEventsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-events', appVersion, 'logs', 'events'));

    new Namespace(this, 'ArgoEventsNamespace', {
      metadata: { name: 'argo-events' },
    });

    new Helm(this, 'argo-events', {
      chart: 'argo-events',
      releaseName: 'argo-events',
      repo: 'https://argoproj.github.io/argo-helm',
      namespace,
      version: chartVersion,
      values: {},
    });
  }
}
