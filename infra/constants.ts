/* Cluster name */
export const ClusterName = 'Workflows';
/* LINZ conventional name for Argo Workflows artifact bucket */
export const ScratchBucketName = `linz-${ClusterName.toLowerCase()}-scratch`;
/* Argo Database Instance name */
export const ArgoDbInstanceName = 'ArgoDb';
/* Argo Database name */
export const ArgoDbName = 'argo';
/* Argo Database user */
export const ArgoDbUser = 'argo_user';

/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  ClusterEndpoint: 'ClusterEndpoint',

  ArgoDbEndpoint: 'ArgoDbEndpoint',

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
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }
}
