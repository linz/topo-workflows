# Cluster Upgrade

Ideally the upgraded versions should be tested in a Dev cluster and the upgrade process in the NonProd (production-like) cluster.

This documentation does not include Argo Workflows upgrade.

## Pre-upgrade

- Identify current and target Kubernetes version
- Review compatibility matrix for the k8s components (`infra/charts/`). ([Karpenter example](https://karpenter.sh/docs/upgrading/compatibility/))
- Check for [any breaking change in Kubernetes](https://github.com/kubernetes/kubernetes/releases)
- TODO: backup cluster state + configuration. _This process has not been implemented yet._

## Upgrade Process

### Kubernetes

Because Kubernetes deprecates quickly and releases often, we need to keep our kubernetes cluster up to date.

**You cannot jump multiple versions** You must do a deployment per individual version bump.

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
   // version = KubernetesVersion.of('1.28'); // if the KubernetesVersion.V1_28 constant is not yet available
   version = KubernetesVersion.V1_28;
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

   ```plaintext
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

#### Cycle out EC2 Nodes to the new version

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

### k8s components

#### Upgrade `cdk8s-plus`

**It is a [good idea](https://cdk8s.io/docs/latest/plus/#i-operate-kubernetes-version-1xx-which-cdk8s-library-should-i-be-using) to check if a `cdk8s-plus` version matches the Kubernetes version you want to upgrade to.**

If there is a version matching the Kubernetes version to upgrade to, upgrade CDK8s-plus before proceeding to upgrade Kubernetes steps.

1. Install the new version

   ```bash
   npm install --save-dev cdk8s-plus-27
   ```

2. Remove the previous version

   ```bash
   npm rm cdk8s-plus-26
   ```

If there is no matching version, upgrade to the highest suitable version (skip this step if no higher version is available).

#### Upgrade components

For each of the component to upgrade:

- Use a compatible version based on Kubernetes version.
- Create a GitHub Pull Request so the upgrade can be done by the CI/CD pipeline that deploys these changes in production using `cdk8s` and `kubectl`.

##### Karpenter

- Update Helm values in `infra/charts/karpenter.ts`
- If API changed from last version, refers to [`karpenter` component documentation](components/karpenter.md) to see how to import new CRDs classes.

##### Fluent Bit

- Update Helm values in `infra/charts/fluentbit.ts`
- More information in [our fluentbit documentation](components/fluentbit.md)

##### Event Exporter

- Update Helm values in `infra/charts/event.exporter.ts`
- More information in [our event-exporter documentation](components/event.exporter.md)

##### Cloudflare

- Get the latest version of the Docker image and [add it to our ECR](components/cloudflared.md#upgrade-container-image)
- Update container image version in `infra/charts/cloudflared.ts`

#### Deployment

##### Production

Our CI/CD pipeline takes care of deploying any changes detected in the IaC (`infra/`), when a PR is merged to the `master` branch. In some cases, the deployment can create an instable state as a component upgrade can not be compatible with the current version of another component that the PR does not modify. It is still a good practice to modify each component with an individual PR to make it easier to track and rollback the change if needed. This instable state must be solved once the PRs for each component to update are merged.

##### Non Production

The process is different in a Dev/NonProd cluster as the deployment will be manual:

1. Generate the kubernetes configuration yaml into `dist/`

   ```shell
   npx cdk8s synth
   ```

2. Apply the generated yaml files

   ```shell
   kubectl apply --filename=dist/
   ```

##### Clean-up

You can safely apply updated YAML manifests on top of the existing deployment, however if some CRDs have changed, for example in a Karpenter upgrade we've seen `Provisioner` -> `NodePool`, Helm does not delete the old CRDs. To avoid potential issues, like confusion from orphaned CRDs, it is a good thing to delete these old CRDs. After deployment:

```shell
kubectl get crds
kubectl deleted crd <old-crd-name>
```
