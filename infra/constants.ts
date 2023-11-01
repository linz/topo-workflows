/* Cluster name */
export const ClusterName = 'WorkflowsAF';

/* Database name */
export const DbName = 'ArgoDbAF'

/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  Karpenter: {
    ServiceAccountName: 'KarpenterServiceAccountName',
    ServiceAccountRoleArn: 'KarpenterServiceAccountRoleArn',
    ClusterEndpoint: 'ClusterEndpoint',
    DefaultInstanceProfile: 'DefaultInstanceProfile',
  },
  FluentBit: {
    ServiceAccountName: 'FluentBitServiceAccountName',
  },
  Argo: {
    RunnerServiceAccountName: 'ArgoRunnerServiceAccountName',
    TempBucketName: 'TempBucketName',
  },
};
