/** AWS default region for our stack */
export const DefaultRegion = 'ap-southeast-2';

const BaseClusterName = 'Workflows';
/**
 * Using the context generate a cluster name
 * @returns cluster name of `Workflows`
 */
export function getClusterName(clusterSuffix: unknown): string {
  if (typeof clusterSuffix !== 'string') return BaseClusterName;
  // convert `blacha` into `WorkflowsBlacha`
  return `Workflows` + clusterSuffix.slice(0, 1).toUpperCase() + clusterSuffix.slice(1).toLowerCase();
}

/** CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  ClusterEndpoint: 'ClusterEndpoint',

  ScratchBucketName: 'ScratchBucketName',

  ArgoDbEndpoint: 'ArgoDbEndpoint',
  ArgoDbName: 'ArgoDbName',
  ArgoDbUsername: 'ArgoDbUsername',

  KarpenterServiceAccountName: 'KarpenterServiceAccountName',
  KarpenterServiceAccountRoleArn: 'KarpenterServiceAccountRoleArn',
  KarpenterDefaultInstanceProfile: 'KarpenterDefaultInstanceProfile',

  FluentBitServiceAccountName: 'FluentBitServiceAccountName',

  ArgoRunnerServiceAccountName: 'ArgoRunnerServiceAccountName',
} as const;

/** The list of possible keys */
export type ICfnOutputKeys = keyof typeof CfnOutputKeys;
/** A map containing a key value pair for every possible CfnOutputKey */
export type CfnOutputMap = Record<ICfnOutputKeys, string>;

/**
 *  Assert that all the keys in this Record contains all the expected CfnOutputKeys
 *
 * @see {@link CfnOutputKeys}
 */
export function validateKeys(cfnOutputs: Record<string, string>): asserts cfnOutputs is CfnOutputMap {
  const missingKeys = Object.values(CfnOutputKeys).filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
}
