# How to destroy an installation

- [Destroy EKS cluster](#destroy-eks-cluster)
- [Destroy RDS](#destroy-rds)

## Destroy EKS cluster

Destroying the cluster and stack is not easy, because we use some custom EKS resources to link the two together. Based on a teardown, at time of writing the following sequence should work:

1. Delete the cluster:

   ```bash
   aws eks delete-cluster --name=Workflows
   aws eks wait cluster-deleted --name=Workflows
   ```

1. Attempt to delete the stack:

   ```bash
   aws cloudformation delete-stack --stack-name=Workflows
   aws cloudformation wait stack-delete-complete --stack-name=Workflows
   ```

1. Wait for the above to fail.
1. Go to the [stack in AWS console](https://ap-southeast-2.console.aws.amazon.com/cloudformation/home?region=ap-southeast-2#/stacks/?filteringText=Workflows&filteringStatus=active&viewNested=true)
1. Delete the stack, retaining all the resources which could not be deleted

The reason we don't use the CLI for the last step is that the logical ID of the resources which could not be deleted does not seem to be the same as the ones which need to be retained. The reason is uncertain, but for now deleting in the console is safer.

[How do I troubleshoot custom resource failures in AWS CloudFormation?](https://repost.aws/knowledge-center/cfn-troubleshoot-custom-resource-failures) might be relevant for future issues like this.

## Destroy RDS

You need to destroy the EKS cluster prior.

`npx cdk destroy [ARGO_DB_STACK]`
