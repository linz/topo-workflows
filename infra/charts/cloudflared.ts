import { Chart, ChartProps, Helm } from 'cdk8s';
import { Namespace } from 'cdk8s-plus-32';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/**
 * This is the version of the Helm chart for cloudflared https://github.com/cloudflare/helm-charts/blob/76f20fe9ca41d8c40fb138635cf23e545df8d45b/charts/cloudflare-tunnel/Chart.yaml#L13
 *
 * (Do not mix up with cloudflared application version)
 */
const chartVersion = '0.3.2';

/**
 * This is the version of cloudflared for the `chartVersion` we're using
 * https://github.com/cloudflare/helm-charts/blob/76f20fe9ca41d8c40fb138635cf23e545df8d45b/charts/cloudflare-tunnel/Chart.yaml#L19
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

    // The helm chart does not create the namespace
    new Namespace(this, 'namespace', {
      metadata: { name: props.namespace },
    });

    new Helm(this, 'cloudflared', {
      chart: 'cloudflare-tunnel',
      releaseName: 'cloudflare-tunnel',
      repo: 'https://cloudflare.github.io/helm-charts',
      namespace: 'cloudflared',
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
