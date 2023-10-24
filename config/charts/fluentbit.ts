import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface FluentBitProps {
  saRoleName: string;
}

export class FluentBit extends Chart {
  constructor(scope: Construct, id: string, props: FluentBitProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'aws-for-fluent-bit', '2.31.11', 'logs', 'workflows'));

    const FluentParserName = 'containerd';
    // This needs to be properly formatted, and it was taken directly from https://github.com/microsoft/fluentbit-containerd-cri-o-json-log
    // The key part is the message must be parsed as "log" otherwise it wont be parsed as JSON
    const FluentContainerParser = `[PARSER]
        Name ${FluentParserName}
        Format regex
        Regex ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    `;

    new Helm(this, 'aws-for-fluent-bit', {
      chart: 'aws-for-fluent-bit',
      repo: 'https://aws.github.io/eks-charts',
      namespace: 'kube-system',
      version: '0.1.30',
      values: {
        input: { parser: FluentParserName, dockerMode: 'Off' },
        serviceAccount: { name: props.saRoleName, create: false },
        cloudWatchLogs: { enabled: true, region: 'ap-southeast-2', autoCreateGroup: true, logRetentionDays: 30 },
        firehose: { enabled: false },
        kinesis: { enabled: false },
        elasticsearch: { enabled: false },
        service: { extraParsers: FluentContainerParser },
      },
    });
  }
}
