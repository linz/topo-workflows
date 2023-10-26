import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface FluentBitProps {
  saRoleName: string;
}

export class FluentBit extends Chart {
  constructor(scope: Construct, id: string, props: FluentBitProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'aws-for-fluent-bit', '2.21.5', 'logs', 'workflows'));

    const FluentParserName = 'containerd';
    // This needs to be properly formatted, and it was taken directly from https://github.com/microsoft/fluentbit-containerd-cri-o-json-log
    // The key part is the message must be parsed as "log" otherwise it wont be parsed as JSON
    const extraParsers = `[PARSER]
        Name ${FluentParserName}
        Format regex
        Regex ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
    `;

    // HTTP_Listen changed to `[::]` https://github.com/aws/eks-charts/issues/983
    const extraService = `
HTTP_Server  On
HTTP_Listen  [::]
HTTP_PORT    2020
Health_Check On 
HC_Errors_Count 5 
HC_Retry_Failure_Count 5 
HC_Period 5 
`;

    new Helm(this, 'aws-for-fluent-bit', {
      chart: 'aws-for-fluent-bit',
      repo: 'https://aws.github.io/eks-charts',
      namespace: 'fluent-bit',
      version: '0.1.23',
      values: {
        fullnameOverride: 'fluentbit',
        input: { parser: FluentParserName, dockerMode: 'Off' },
        serviceAccount: { name: props.saRoleName, create: false },
        cloudWatchLogs: { enabled: true, region: 'ap-southeast-2', autoCreateGroup: true, logRetentionDays: 30 },
        firehose: { enabled: false },
        kinesis: { enabled: false },
        elasticsearch: { enabled: false },
        service: { extraParsers, extraService },
      },
    });
  }
}
