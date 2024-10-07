# Upgrade Kubernetes Versions

Because Kubernetes deprecates quickly and releases often, we need to keep our kubernetes cluster up to date.

**You cannot jump multiple versions** You must do a deployment per individual version bump.

## Upgrade steps

### Upgrade `cdk8s-plus`

**It is a [good idea](https://cdk8s.io/docs/latest/plus/#i-operate-kubernetes-version-1xx-which-cdk8s-library-should-i-be-using) to check if a `CDK8s-plus` version matches the Kubernetes version you want to upgrade to.**

If there is a version matching to the Kubernetes version to upgrade to, upgrade CDK8s-plus before proceeding to upgrade Kubernetes steps.

1. Install the new version

   ```bash
   npm install --save-dev cdk8s-plus-27
   ```

2. Remove the previous version

   ```bash
   npm rm cdk8s-plus-26
   ```

If there is no version matching, keep the version installed and proceed to upgrade Kubernetes steps.

### Upgrade Kubernetes

Below is an example of upgrading from v1.27 to v1.28

1. Update lambda-layer version to the matching version number

   ```bash
   npm install --save-dev @aws-cdk/lambda-layer-kubectl-v28
   ```

   While also removing the old lambda-layer version

   ```bash
   npm rm @aws-cdk/lambda-layer-kubectl-v27
   ```

2. Set the new Kubernetes version in `LinzEksCluster`

   ```typescript
   version = KubernetesVersion.of('1.28');
   ```

3. Modify layer version

   ```typescript
   import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28';

   // ...

         kubectlLayer: new KubectlV28Layer(this, 'KubeCtlLayer'),
   ```

4. Diff the stack to make sure that only versions are updated

   ```bash
   ci_role="$(aws iam list-roles | jq --raw-output '.Roles[] | select(.RoleName | contains("CiTopo")) | select(.RoleName | contains("-CiRole")).Arn')"
   admin_role="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/AccountAdminRole"
   workflow_maintainer_role="$(aws cloudformation describe-stacks --stack-name=TopographicSharedResourcesProd | jq --raw-output .Stacks[0].Outputs[0].OutputValue)"
   npx cdk diff --context=maintainer-arns="${ci_role},${admin_role},${workflow_maintainer_role}" Workflows
   ```

   The only changes should be Kubernetes version related.

   ```
   Resources
   [~] AWS::Lambda::LayerVersion KubeCtlLayer KubeCtlLayer replace
    ├─ [~] Content (requires replacement)
    │   └─ [~] .S3Key:
    │       ├─ [-] 8e18eb5caccd2617fb76e648fa6a35dc0ece98c4681942bc6861f41afdff6a1b.zip
    │       └─ [+] b4d47e4f1c5e8fc2df2cd474ede548de153300d332ba8d582b7c1193e61cbe1e.zip
    ├─ [~] Description (requires replacement)
    │   ├─ [-] /opt/kubectl/kubectl 1.27; /opt/helm/helm 3.12
    │   └─ [+] /opt/kubectl/kubectl 1.28; /opt/helm/helm 3.13
    └─ [~] Metadata
        └─ [~] .aws:asset:path:
            ├─ [-] asset.8e18eb5caccd2617fb76e648fa6a35dc0ece98c4681942bc6861f41afdff6a1b.zip
            └─ [+] asset.b4d47e4f1c5e8fc2df2cd474ede548de153300d332ba8d582b7c1193e61cbe1e.zip
   [~] Custom::AWSCDK-EKS-Cluster EksWorkflows/Resource/Resource EksWorkflows
    └─ [~] Config
        └─ [~] .version:
            ├─ [-] 1.27
            └─ [+] 1.28
   ```

5. Create a pull request and wait for CI/CD to deploy the changes

**Version bump deployments can take 10+ minutes :coffee:**

## Cycle out EC2 Nodes to the new version

<https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html#version-deprecation>

> **Are Amazon EKS managed node groups automatically updated along with the cluster control plane version?**
> No. A managed node group creates Amazon EC2 instances in your account. These instances aren't automatically upgraded when you or Amazon EKS update your control plane. For more information, see Updating a managed node group. We recommend maintaining the same Kubernetes version on your control plane and nodes.

This process is necessary to avoid being blocked for a future Kubernetes version upgrade. For example, if Kubernetes get upgraded from `1.27` to `1.28` and the nodes remain in `1.27`, the next time Kubernetes will be upgraded to `1.29`, the upgrade will fail.

1. Find the nodegroup name for the cluster

   ```bash
   node_group_name="$(aws eks list-nodegroups --cluster-name=Workflows | jq --raw-output '.nodegroups[]')"
   ```

2. Describe the nodegroup to validate the versions

   By describing the node group you can check the current version, or you can use `k get nodes` to see what version is currently running

   ```bash
   aws eks describe-nodegroup --cluster-name=Workflows --nodegroup-name="$node_group_name" | jq --raw-output .nodegroup.version
   ```

3. Update the version to match

   ```bash
   aws eks update-nodegroup-version --cluster-name=Workflows --nodegroup-name="$node_group_name"
   ```

   This step takes some time to run. You can wait for it to finish with this command:

   ```bash
   aws eks wait nodegroup-active --cluster-name=Workflows --nodegroup-name="$node_group_name"
   ```
