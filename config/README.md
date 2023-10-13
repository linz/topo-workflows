# Topo-Workflows Infrastructure

The infrastructure running the workflows is mainly based on a Kubernetes (EKS) cluster and Argo Workflows. It is currently run on AWS.
Generally all Kubernetes resources are defined with cdk8s and anything that needs AWS interactions such as service accounts are defined with CDK.

## EKS Cluster / AWS CDK

The EKS Cluster base configuration is defined in `./cdk.ts` using [`aws-cdk`](https://aws.amazon.com/cdk/).

## Kubernetes resources / CDK8s

The additional components (or Kubernetes resources) running on the EKS cluster are defined in `./cdk8s` using [`cdk8s`](https://cdk8s.io/).

Main entry point: [app](./cdk8s.ts)

- Argo - Argo workflows for use with [linz/topo-workflows](https://github.com/linz/topo-workflows)
- Karpenter

### Argo Workflows

#### Semaphores

ConfigMap that list the synchronization limits for parallel execution of the workflows.

### Karpenter

TODO

### Generate code

Generate code from Helm:
It is possible to generate a specific Helm construct for the component if their chart includes a `value.schema.json`. This is useful to provide typing hints when specifying their configuration (<https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema>)

To generate the Helm Construct for a specific Chart, follow the instructions [here](https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema):

Specify the output for the imports:

`--output config/imports/`

However, some of the component Helm charts do not have a `values.schema.json`. For those we won't generate any code and use the default `Helm` construct:

- aws-for-fluent-bit (<https://github.com/aws/eks-charts/issues/1011>)
- Karpenter

### Working with Helm charts

#### Generate code

It is possible to generate a specific Helm construct for the component if their chart includes a `value.schema.json`. This is useful to provide typing hints when specifying their configuration (<https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema>)

To generate the Helm Construct for a specific Chart, follow the instructions [here](https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema)

However, some of the component Helm charts do not have a `values.schema.json`. For those we won't generate any code and use the default `Helm` construct:

- aws-for-fluent-bit (<https://github.com/aws/eks-charts/issues/1011>)


## Usage (for test)

Ensure all dependencies are installed

```shell
npm install
```

Login to AWS

Generate the kubernetes configuration yaml into `dist/`

```shell
npx cdk8s synth
```

Apply the generated yaml files

```shell
kubectl apply -f dist/
```

## Deployment

The deployment of the K8s config is managed by GithubActions in [main](../.github/workflows/main.yml).

## Troubleshoot

- [DNS](../docs/dns.configuration.md)
