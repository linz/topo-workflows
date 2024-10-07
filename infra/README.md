# Topo-Workflows Infrastructure

The infrastructure running the workflows is mainly based on a Kubernetes (AWS EKS) cluster and Argo Workflows.

Generally all Kubernetes resources are defined with [`cdk8s`](https://cdk8s.io/) and anything that needs AWS interactions such as service accounts are defined with [`aws-cdk`](https://aws.amazon.com/cdk/).

## EKS Cluster / AWS CDK

The EKS Cluster base configuration is defined in [./cdk.ts](./cdk.ts) using [`aws-cdk`](https://aws.amazon.com/cdk/).

## Kubernetes resources / CDK8s

The additional components (or Kubernetes resources) running on the EKS cluster are defined in [./cdk8s.ts](./cdk8s.ts) using [`cdk8s`](https://cdk8s.io/).

Main entry point: [app](./cdk8s.ts)

## Components

- [ArgoWorkflows](../docs/infrastructure/components/argo.workflows.md) - Main Workflow engine
- [Karpenter](../docs/infrastructure/components/karpenter.md) - Autoscale EC2 Nodes
- [FluentBit](../docs/infrastructure/components/fluentbit.md) - Forward logs to AWS CloudWatch

## Deployments

### Prerequisites

- [Helm](https://helm.sh/docs/intro/install/)
- Ensure all dependencies are installed

  ```shell
  npm install
  ```
- Login to AWS

### Deploy CDK

To deploy with AWS CDK a few context values need to be set:

- `aws-account-id`: Account ID to deploy into. This can be set with `export CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"`.
- `maintainer-arns`: Comma-separated list of AWS Role ARNs for the stack maintainers.

Then a deployment can be made with `cdk`:

```shell
ci_role="$(aws iam list-roles | jq --raw-output '.Roles[] | select(.RoleName | contains("CiTopo")) | select(.RoleName | contains("-CiRole")).Arn')"
admin_role="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/AccountAdminRole"
workflow_maintainer_role="$(aws cloudformation describe-stacks --stack-name=TopographicSharedResourcesProd | jq --raw-output .Stacks[0].Outputs[0].OutputValue)"
npx cdk deploy --context=maintainer-arns="${ci_role},${admin_role},${workflow_maintainer_role}" Workflows
```

### Deploy CDK8s

Generate the kubernetes configuration yaml into `dist/`

```shell
npx cdk8s synth
```

Apply the generated yaml files

```shell
kubectl apply --filename=dist/
```

### Testing

To debug use the following as `cdk8s synth` swallows the errors

```shell
npx tsx infra/cdk8s.ts
```

## CICD Deployment

The deployment of the K8s config is managed by GithubActions in [main](../.github/workflows/main.yml).

## Notes

- [Initial Deployment](../docs/infrastructure/initial.deployment.md)
- [Version Upgrade Guide](../docs/infrastructure/kubernetes.version.md)
- [DNS Troubleshooting](../docs/dns.configuration.md)
- [Working with Helm](../docs/infrastructure/helm.md)
