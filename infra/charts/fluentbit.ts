import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/** version of the Helm chart (not FluentBit app) */
const awsForFluentBitVersion = '0.1.31';
export interface FluentBitProps {
  saRoleName: string;
  clusterName: string;
}

export class FluentBit extends Chart {
  constructor(scope: Construct, id: string, props: FluentBitProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'aws-for-fluent-bit', awsForFluentBitVersion, 'logs', 'workflows'));

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

    /**
     * FIXME: We deactivated the HTTP server to avoid getting this issue:
     * https://github.com/aws/eks-charts/issues/983
     *
     */
    const extraService = `
HTTP_Server  Off
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
      namespace: 'fluentbit',
      version: awsForFluentBitVersion,
      values: {
        fullnameOverride: 'fluentbit',
        input: { parser: FluentParserName, dockerMode: 'Off' },
        serviceAccount: { name: props.saRoleName, create: false },
        cloudWatchLogs: {
          enabled: true,
          region: 'ap-southeast-2',
          autoCreateGroup: true,
          logRetentionDays: 30,
          logGroupName: `/aws/eks/${props.clusterName}/logs`,
          logGroupTemplate: `/aws/eks/${props.clusterName}/workload/$kubernetes['namespace_name']`,
          logStreamPrefix: 'fb-',
        },
        firehose: { enabled: false },
        kinesis: { enabled: false },
        elasticsearch: { enabled: false },
        service: { extraParsers, extraService },
        // FIXME: `livenessProbe` and `readinessProbe` deactivated https://github.com/aws/eks-charts/issues/995
        livenessProbe: false,
        readinessProbe: false,
      },
    });
  }
}
