# Kubernetes configuration with CDK8s

Collection of Kubernetes resources.

## Components

Main entry point: [app](./app.ts)

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
