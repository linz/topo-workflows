# Kubernetes configuration with CDK8s and AWS-CDK

Collection of AWS & Kubernetes resources.

## Components

Main entry point: [cdk8s](./cdk8s.ts) and [cdk](./cdk.ts) 

Generally all Kubernetes resources are defined with cdk8s and anything that needs AWS interactions such as service accounts are defined with CDK.

- argo - Argo workflows for use with [linz/topo-workflows](https://github.com/linz/topo-workflows)

### Argo Workflows

#### Semaphores

ConfigMap that list the synchronization limits for parallel execution of the workflows.

## Development

<https://cdk8s.io/>

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
