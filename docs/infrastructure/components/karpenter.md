# Karpenter

## Import Karpenter CRDs classes

Karpenter uses Custom Resource Definitions (CRDs) fir resources such as `NodePool` and `EC2NodeClass`.
As `cdk8s` does not natively know the structure of these CRDs, we need to import them in our code base.

1. Import the CRDs into TypeScript classes:

   ``` shell
   npx cdk8s import https://raw.githubusercontent.com/aws/karpenter-provider-aws/refs/tags/v1.5.0/pkg/apis/crds/karpenter.sh_nodepools.yaml
   npx cdk8s import https://raw.githubusercontent.com/aws/karpenter-provider-aws/refs/tags/v1.5.0/pkg/apis/crds/karpenter.k8s.aws_nodeclasses.yaml
   ```

2. Remove unnecessary linter rules such as:

   ``` typescript
   /* eslint-disable max-len, @stylistic/max-len, quote-props, @stylistic/quote-props */
   ```

3. Move the files to `infra/charts/imports/`
