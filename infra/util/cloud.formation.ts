import { CloudFormation } from '@aws-sdk/client-cloudformation';
import { Cluster, EKS } from '@aws-sdk/client-eks';

export async function getCfnOutputs(stackName: string): Promise<Record<string, string>> {
  const cfn = new CloudFormation();
  const searchStacks = await cfn.describeStacks({ StackName: stackName });
  const outputs: Record<string, string> = {};
  const stack = searchStacks?.Stacks?.find((s) => s.StackName === stackName);
  if (stack?.Outputs == null) throw new Error(`Unable to find stack "${stackName}"`);

  stack.Outputs.forEach(({ OutputKey, OutputValue }) => {
    if (OutputKey != null && OutputValue != null) outputs[OutputKey] = OutputValue;
  });
  return outputs;
}

export async function describeCluster(clusterName: string): Promise<Cluster> {
  const eks = new EKS();
  const describe = await eks.describeCluster({ name: clusterName });
  if (describe.cluster == null) throw new Error('Cluster not found: ' + clusterName);
  return describe.cluster;
}
