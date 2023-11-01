/* Cluster name */
export const ClusterName = 'WorkflowsAF';

/* Database name */
export const DbName = 'ArgoDbAF'

/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  Karpenter: {
    ServiceAccountName: 'KarpenterServiceAccountNameAF',
    ServiceAccountRoleArn: 'KarpenterServiceAccountRoleArnAF',
    ClusterEndpoint: 'ClusterEndpointAF',
    DefaultInstanceProfile: 'DefaultInstanceProfileAF',
  },
  FluentBit: {
    ServiceAccountName: 'FluentBitServiceAccountNameAF',
  },
  Argo: {
    RunnerServiceAccountName: 'ArgoRunnerServiceAccountNameAF',
    TempBucketName: 'TempBucketNameAF',
  },
};
