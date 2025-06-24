import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/**
 * This is the version of the Helm chart for Argo Workflows https://github.com/argoproj/argo-helm/blob/25d7b519bc7fc37d2820721cd648f3a3403d0e38/charts/argo-workflows/Chart.yaml#L6
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '0.3.2';

/**
 * This is the version of Argo Workflows for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/2730dc24c7ad69b98d3206705a5ebf5cb34dd96b/charts/argo-workflows/Chart.yaml#L2
 *
 */
const appVersion = '2024.8.3';

export class Cloudflared extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: { tunnelId: string; tunnelSecret: string; accountId: string; tunnelName: string } & ChartProps,
  ) {
    super(scope, id, applyDefaultLabels(props, 'cloudflared', appVersion, 'tunnel', 'workflows'));

    new Helm(this, 'cloudflared', {
      chart: 'cloudflare-tunnel',
      releaseName: 'cloudflare-tunnel',
      repo: 'https://cloudflare.github.io/helm-charts',
      namespace: 'argo',
      version: chartVersion,
      values: {
        cloudflare: {
          account: props.accountId,
          tunnelName: props.tunnelName,
          tunnelId: props.tunnelId,
          secret: props.tunnelSecret,
        },
      },
    });
  }
}
