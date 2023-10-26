import { CloudFormation } from '@aws-sdk/client-cloudformation';

export async function getCfnOutputs(stackName: string): Promise<Record<string, string>> {
  const cfn = new CloudFormation();
  const searchStacks = await cfn.describeStacks({ StackName: stackName });
  cfn.listExports;
  const outputs: Record<string, string> = {};
  const stacks = (searchStacks && searchStacks.Stacks) || [];
  const stack = stacks.find((s) => s.StackName === stackName);

  if (!stack) {
    throw new Error(`Unable to find stack "${stackName}"`);
  }
  if (!stack.Outputs) {
    throw new Error(`There is no output for stack "${stackName}"`);
  }
  stack.Outputs.forEach(({ OutputKey, OutputValue }) => {
    if (OutputKey && OutputValue) {
      outputs[OutputKey] = OutputValue;
    }
  });
  return outputs;
}
