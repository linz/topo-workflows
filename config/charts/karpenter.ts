import { CloudFormation } from '@aws-sdk/client-cloudformation';
import { Chart, ChartProps, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export class Karpenter extends Chart {
  constructor(scope: Construct, id: string, props: { roleArn: string } & ChartProps) {
    // TODO: What is the component name? 'karpenter' or 'autoscaling'?
    super(scope, id, applyDefaultLabels(props, 'karpenter', '', 'karpenter', 'workflows'));

    // Get EKS cluster information

    new Helm(this, 'karpenter', {
      chart: 'karpenter',
      repo: 'oci://public.ecr.aws/karpenter/karpenter',
      namespace: 'karpenter',
      version: 'v0.31.0',
      releaseName: 'karpenter',
      values: {
        serviceAccount: {
          create: false,
          name: 'karpenter-controller-sa', // This service account is created in the CDK infrastructure
          annotations: { 'eks.amazonaws.com/role-arn': 'TODO' }, //TODO: how should we not pass the arn
        },
        settings: {
          aws: {
            clusterName: 'Workflow', // This is the name of the cluster deployed
            clusterEndpoint: 'TODO', // TODO: are we allowed to share this?
            defaultInstanceProfile: 'TODO', // TODO: how to get this value?
          },
        },
      },
    });
  }
}

export async function getStackFromName(stackName: string): Promise<void> {
  const cfn = new CloudFormation();
  const clusterStack = await cfn.describeStacks({ StackName: stackName });
  if (clusterStack.Stacks) {
    console.log(clusterStack.Stacks[0]);
  }
}

// TODO: remove tests
async function main(): Promise<void> {
  const clusterStackName = 'EksWorkflowProd';
  await getStackFromName(clusterStackName);
}

main();
