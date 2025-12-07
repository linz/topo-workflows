import { ApiObject, Chart, ChartProps, JsonPatch, Size } from 'cdk8s';
import * as kplus from 'cdk8s-plus-32';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.ts';

export class Cloudflared extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: { tunnelId: string; tunnelSecret: string; accountId: string; tunnelName: string } & ChartProps,
  ) {
    const cloudflaredVersion = '2025.6.1';
    super(scope, id, applyDefaultLabels(props, 'cloudflared', cloudflaredVersion, 'tunnel', 'workflows'));

    // TODO should we create a new namespace every time
    new kplus.Namespace(this, 'namespace', {
      metadata: { name: props.namespace },
    });

    const cm = new kplus.ConfigMap(this, 'config', {
      data: {
        'config.yaml': [
          `tunnel: ${props.tunnelName}`, // Tunnel name must match the credentials
          'credentials-file: /etc/cloudflared/creds/credentials.json', // defined by "kplus.Secret" below
          `metrics: "[::]:2000"`,
          'no-autoupdate: true',
          'protocol: http2', // quic is blocked in the LINZ network
        ].join('\n'),
      },
    });

    // Secret credentials for the tunnel
    const secret = new kplus.Secret(this, 'secret');
    secret.addStringData(
      'credentials.json',
      JSON.stringify({
        AccountTag: props.accountId,
        TunnelID: props.tunnelId,
        TunnelSecret: props.tunnelSecret,
      }),
    );

    const deployment = new kplus.Deployment(this, 'tunnel', {
      // Ensure two tunnels are active
      replicas: 2,
      containers: [
        {
          name: 'cloudflared',
          image: `019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/cloudflared:${cloudflaredVersion}`,
          args: ['tunnel', '--loglevel', 'trace', '--config', '/etc/cloudflared/config/config.yaml', 'run'],
          volumeMounts: [
            { volume: kplus.Volume.fromConfigMap(this, 'mount-config', cm), path: '/etc/cloudflared/config' },
            { volume: kplus.Volume.fromSecret(this, 'mount-secret', secret), path: '/etc/cloudflared/creds' },
          ],
          resources: { memory: { request: Size.mebibytes(128) } },
          // Cloudflared runs as root
          securityContext: { ensureNonRoot: false },
        },
      ],
      securityContext: { ensureNonRoot: false },
    });

    // manually set option that could not be configured with cdk8s-plus
    ApiObject.of(deployment).addJsonPatch(JsonPatch.add('/spec/template/spec/priorityClassName', 'high-priority'));
  }
}
