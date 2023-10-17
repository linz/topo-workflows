import { EKS } from '@aws-sdk/client-eks';

export async function getClusterFromName(clusterName: string): Promise<void> {
  const eks = new EKS();
  const eksCluster = await eks.describeCluster({ name: clusterName });
  if (eksCluster.cluster) {
    console.log(eksCluster.cluster);
  }
}

// TODO: remove tests
async function main(): Promise<void> {
  const eksClusterName = 'Workflow';
  await getClusterFromName(eksClusterName);
}

main();
