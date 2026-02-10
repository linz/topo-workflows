const environmentSuffix = ''; // e.g. 'Dev', 'NP'
/** Cluster name */
export const ClusterName = `Workflows${environmentSuffix}`;
/** LINZ conventional name for Argo Workflows artifact bucket */
export const ScratchBucketName = `linz-${ClusterName.toLowerCase()}-scratch`;
/** Argo Database Instance name */
export const ArgoDbInstanceName = `ArgoDb${environmentSuffix}`;
/** Argo Database name */
export const ArgoDbName = 'argo';
/** Argo Database user */
export const ArgoDbUser = 'argo_user';
/** SQS Queue name */
export const SqsQueuesName = `SqsQueues${environmentSuffix}`;
/** AWS default region for our stack */
export const DefaultRegion = 'ap-southeast-2';

/**
 * Should NodeLocal DNS be enabled for the cluster
 *
 * @see ./charts/kube-system.coredns.ts
 */
export const UseNodeLocalDns = true;

/** CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  ClusterEndpoint: 'ClusterEndpoint',

  ArgoDbEndpoint: `ArgoDbEndpoint${environmentSuffix}`,
  ArgoDbSecurityGroupId: `ArgoDbSecurityGroupId${environmentSuffix}`,

  ScratchPublishSqsQueueArn: `ScratchPublishSqsQueueArn`,

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
