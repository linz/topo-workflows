# Upgrade Kubernetes Versions

Because Kubernetes deprecates quickly and releases often. We need to keep our kubernetes cluster up to date.

**You cannot jump multiple versions** You must do a deployment per individual version bump.

## Upgrade steps

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
npx cdk diff Workflows -c ci-role-arn=...
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

5. Create a pull request and wait for CI/CD to deploy the changes.

**Version bump deployments can take 10+ minutes**

6. Cycle out EC2 Nodes to the new version.
