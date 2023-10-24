/* Cluster name */
export const ClusterName = 'Workflows';

/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  Karpenter: {
    ServiceAccountName: 'KarpenterServiceAccountName',
    ServiceAccountRoleArn: 'KarpenterServiceAccountRoleArn',
    ClusterEndpoint: 'ClusterEndpoint',
    DefaultInstanceProfile: 'DefaultInstanceProfile',
  },
};
