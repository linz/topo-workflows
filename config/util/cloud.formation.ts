import { CloudFormation } from '@aws-sdk/client-cloudformation';

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
