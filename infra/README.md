# Topo-Workflows Infrastructure

The infrastructure running the workflows is mainly based on a Kubernetes (AWS EKS) cluster and Argo Workflows.

Generally all Kubernetes resources are defined with [`cdk8s`](https://cdk8s.io/) and anything that needs AWS interactions such as service accounts are defined with [`aws-cdk`](https://aws.amazon.com/cdk/).

## EKS Cluster / AWS CDK

The EKS Cluster base configuration is defined in [./cdk.ts](./cdk.ts) using [`aws-cdk`](https://aws.amazon.com/cdk/).


## Kubernetes resources / CDK8s

The additional components (or Kubernetes resources) running on the EKS cluster are defined in [./cdk8s.ts](./cdk8s.ts) using [`cdk8s`](https://cdk8s.io/).

Main entry point: [app](./cdk8s.ts)

#### Components:

- [ArgoWorkflows](../docs/infrastructure/components/argo.workflows.md) - Main Workflow engine
- [Karpenter](../docs/infrastructure/components/karpenter.md) - Autoscale EC2 Nodes
- [FluentBit](../docs/infrastructure/components/karpenter.md) - Forward logs to AWS CloudWatch




## Deployments

Ensure all dependencies are installed

```shell
npm install
```

Login to AWS
### Deploy CDK

To deploy with AWS CDK a few configuration variables need to be set

Due to VPC lookups a AWS account ID needs to be provided

This can be done with either a `export CDK_DEFAULT_ACCOUNT=1234567890` or passed in at run time with `-c aws-account-id=1234567890`

Then a deployment can be made with `cdk`

```
npx cdk diff -c aws-account-id=1234567890 -c ci-role-arn=arn::...
```

#### CDK Context

- `aws-account-id`: Account ID to deploy into
- `ci-role-arn`: AWS Role ARN for the CI user

### Deploy CDK8s
Generate the kubernetes configuration yaml into `dist/`

```shell
npx cdk8s synth
```

Apply the generated yaml files

```shell
kubectl apply -f dist/
```

### Testing

To debug use the following as `cdk8s syth` swallows the errors

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



