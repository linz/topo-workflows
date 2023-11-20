# Initial deployment

The initial deployment is a two step process:

1. AWS-CDK is used to create a EKS cluster and AWS RDS Postgres Instance.
2. CDK8s is used to deploy the applications into the cluster.

## Custom Resource Definitions

The first time a cluster is deployed Custom Resource Definitions (CRD) will not exist, when `kubectl` is used to deploy the CRDs for [Karpenter](./components/karpenter.md) and [Argo Workflows](./components/argo.workflows.md) it does not wait for the CRDs to finish deploying before starting the next step.

This means that any resources that require a CRD will fail to deploy with a error similar to

> resource mapping not found for name: "karpenter-template" namespace: "" from "dist/0003-karpenter-provisioner.k8s.yaml": no matches for kind "AWSNodeTemplate" in version "karpenter.k8s.aws/v1alpha1"

To work around this problem the first deployment can be repeated, as the CRDs are deployed early in the deployment process.
