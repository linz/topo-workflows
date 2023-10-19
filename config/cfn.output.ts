/* CloudFormation Output to access from CDK8s */
export const CfnOutputKeys = {
  Karpenter: {
    ServiceAccountRoleArn: 'KarpenterServiceAccountRoleArn',
    ClusterEndpoint: 'ClusterEndpoint',
    DefaultInstanceProfile: 'DefaultInstanceProfile',
  },
};
