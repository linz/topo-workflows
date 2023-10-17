# Kubernetes configuration with CDK8s

Collection of Kubernetes resources.

## Components

Main entry point: [app](./app.ts)

- Argo - Argo workflows for use with [linz/topo-workflows](https://github.com/linz/topo-workflows)
- Karpenter

### Argo Workflows

#### Semaphores

ConfigMap that list the synchronization limits for parallel execution of the workflows.

### Karpenter

## Development

<https://cdk8s.io/>

### Working with Helm charts

#### Generate code

It is possible to generate a specific Helm construct for the component if their chart includes a `value.schema.json`. This is useful to provide typing hints when specifying their configuration (<https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema>)

To generate the Helm Construct for a specific Chart, follow the instructions [here](https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema):

- add the Helm to `helm`

```shell

```

`--output config/imports/`

However, some of the component Helm charts do not have a `values.schema.json`. For those we won't generate any code and use the default `Helm` construct:

- aws-for-fluent-bit (<https://github.com/aws/eks-charts/issues/1011>)
- Karpenter

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
