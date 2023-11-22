import { CloudFormation } from '@aws-sdk/client-cloudformation';

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
