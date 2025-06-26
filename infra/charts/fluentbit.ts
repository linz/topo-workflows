import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { DefaultRegion } from '../constants.js';
import { applyDefaultLabels } from '../util/labels.js';

/**
 * version of the Helm chart (not FluentBit app)
 *
 * https://github.com/aws/eks-charts/blob/a644fd925ca091d881b3a42aace268322f484455/stable/aws-for-fluent-bit/Chart.yaml#L4
 * */
const chartVersion = '0.1.35';

/**
 * version of the application
 *
 * https://github.com/aws/eks-charts/blob/a644fd925ca091d881b3a42aace268322f484455/stable/aws-for-fluent-bit/Chart.yaml#L5C11-L5C29
 */
const appVersion = '2.32.2.20240516';

export interface FluentBitProps {
  /**
   * Name of the Service Account used to run workflows
   *
   * @example "fluentbit-sa"
   */
  saName: string;
  /**
   * Name of the EKS cluster
   *
   * @example "Workflows"
   */
  clusterName: string;
}

export class FluentBit extends Chart {
  constructor(scope: Construct, id: string, props: FluentBitProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'aws-for-fluent-bit', appVersion, 'logs', 'workflows'));

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
     * FIXME: Listening on ipv6 [::] to avoid getting this issue:
     * https://github.com/aws/eks-charts/issues/983
     *
     */
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
      namespace: 'fluentbit',
      version: chartVersion,
      values: {
        fullnameOverride: 'fluentbit',
        input: { parser: FluentParserName, dockerMode: 'Off' },
        serviceAccount: { name: props.saName, create: false },
        priorityClassName: 'very-high-priority',
        cloudWatchLogs: {
          enabled: true,
          region: DefaultRegion,
          /** Specify Cloudwatch endpoint to add a trailing `.` to force FQDN DNS request */
          endpoint: `logs.${DefaultRegion}.amazonaws.com.`,
          autoCreateGroup: true,
          logRetentionDays: 30,
          logGroupName: `/aws/eks/${props.clusterName}/logs`,
          logGroupTemplate: `/aws/eks/${props.clusterName}/workload/$kubernetes['namespace_name']`,
          logStreamPrefix: 'fb-',
          /**
           * Set the Fluent Bit idle timeout to 4 seconds.
           * This helps reduce the rate of network errors in the logs.
           * See: https://github.com/aws/aws-for-fluent-bit/issues/340
           */
          extraOutputs: `net.keepalive_idle_timeout 4s`,
        },
        firehose: { enabled: false },
        kinesis: { enabled: false },
        elasticsearch: { enabled: false },
        service: { extraParsers, extraService },
        filter: {
          /**
           * Increase the Buffer_Size (default "32k")
           * as we experienced logs not coming through
           * See: https://github.com/argoproj/argo-workflows/issues/13314
           */
          bufferSize: '128k',
          /**
           * Remove the `log` field from the logs
           * as it has been parsed into the `data` field
           * so we don't want duplicated logs
           */
          keepLog: 'Off',
        },
        tolerations: [
          { key: 'karpenter.sh/capacity-type', operator: 'Equal', value: 'spot', effect: 'NoSchedule' },
          { key: 'kubernetes.io/arch', operator: 'Equal', value: 'arm64', effect: 'NoSchedule' },
        ],
      },
    });
  }
}
