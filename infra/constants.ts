/* Cluster name */
export const ClusterName = 'WorkflowsAF';
export const ArgoDbName = 'ArgoDbAF';

/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  ClusterEndpoint: 'ClusterEndpoint',
  ClusterSecurityGroupId: 'ClusterSecurityGroupId',

  KarpenterServiceAccountName: 'KarpenterServiceAccountName',
  KarpenterServiceAccountRoleArn: 'KarpenterServiceAccountRoleArn',
  KarpenterDefaultInstanceProfile: 'KarpenterDefaultInstanceProfile',

  FluentBitServiceAccountName: 'FluentBitServiceAccountName',

  ArgoRunnerServiceAccountName: 'ArgoRunnerServiceAccountName',

  TempBucketName: 'TempBucketName',
} as const;

export const CfnOutputKeysArgoDb = {
  ArgoDbEndpoint: 'ArgoDbEndpoint',
  // TODO: decide on method to add DB secret to K8s from AWS Secrets Manager
  ArgoDbSecretName: 'ArgoDbSecretName',
} as const;

/** The list of possible keys */

export type ICfnOutputKeys = keyof typeof CfnOutputKeys;
/** A map containing a key value pair for every possible CfnOutputKey */
export type CfnOutputMap = Record<ICfnOutputKeys, string>;
/** A map containing a key value pair for every possible CfnOutputKeyArgoDb */
// TODO this is a horrible hack that needs refactoring to validate keys from multiple stacks
export type ICfnOutputKeysArgoDb = keyof typeof CfnOutputKeysArgoDb;
/** A map containing a key value pair for every possible CfnOutputKey */
export type CfnOutputMapArgoDb = Record<ICfnOutputKeysArgoDb, string>;

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

export function validateKeysArgoDb(cfnOutputs: Record<string, string>): asserts cfnOutputs is CfnOutputMapArgoDb {
  const missingKeys = Object.values(CfnOutputKeysArgoDb).filter((f) => cfnOutputs[f] == null);
  if (missingKeys.length > 0) {
    throw new Error(`Missing CloudFormation Outputs for keys ${missingKeys.join(', ')}`);
  }
}
