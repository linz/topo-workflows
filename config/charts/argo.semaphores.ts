import { Chart, ChartProps } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../labels/labels';

export class ArgoSemaphore extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo', 'v1', 'semaphores', 'workflows'));

    const cm = new kplus.ConfigMap(this, 'semaphores', {
      data: {
        'config.yaml': [
          `tunnel: ${props.tunnelName}`, // Tunnel name must match the credentials
          'credentials-file: /etc/cloudflared/creds/credentials.json', // defined by "secret"
          `metrics: "[::]:2000"`,
          'no-autoupdate: true',
          'protocol: http2', // quic is blocked in the LINZ network
        ].join('\n'),
      },
    });

    //     apiVersion: v1
    // kind: ConfigMap
    // metadata:
    //   name: semaphores
    //   namespace: argo
    // data:
    //   standardising: '2' # Limit of how many standardising workflow instances can run at the same time
    //   bulk: '4' # Limit of how many bulk workflow instances can run at the same time
    //   bulkcopy: '8' # Limit of how many publish-copy workflow instances can run at the same time
    //   basemaps_import: '10' # Limit of how many basemaps import workflow instances can run at the same time
  }
}
