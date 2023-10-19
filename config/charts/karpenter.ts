import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface KarpenterProps {
  clusterName: string;
  saRoleName: string;
  saRoleArn: string;
  clusterEndpoint: string;
  instanceProfile: string;
}

export class Karpenter extends Chart {
  constructor(scope: Construct, id: string, props: KarpenterProps & ChartProps) {
    // TODO: What is the component name? 'karpenter' or 'autoscaling'?
    super(scope, id, applyDefaultLabels(props, 'karpenter', '', 'karpenter', 'workflows'));

    new Helm(this, 'karpenter', {
      chart: 'karpenter',
      repo: 'oci://public.ecr.aws/karpenter/karpenter',
      namespace: 'karpenter',
      version: 'v0.31.0',
      releaseName: 'karpenter',
      values: {
        serviceAccount: {
          create: false,
          name: props.saRoleName,
          annotations: { 'eks.amazonaws.com/role-arn': props.saRoleArn },
        },
        settings: {
          aws: {
            clusterName: props.clusterName,
            clusterEndpoint: props.clusterEndpoint,
            defaultInstanceProfile: props.instanceProfile,
          },
        },
      },
    });
  }
}
