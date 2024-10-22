# Local environment

It is possible to install a cluster on your local machine. In this documentation we will use [`kind`](https://kind.sigs.k8s.io/).

## Pre-requisite

- [Docker](https://docs.docker.com/engine/install/)
- [`kind`](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/#kubectl)
- [Argo CLI](https://argo-workflows.readthedocs.io/en/latest/walk-through/argo-cli/#argo-cli)

## Cluster

To create a cluster using `kind`:

```bash
kind create cluster --name argo
```

> **_NOTE:_** The [`kind` Node container](https://hub.docker.com/r/kindest/node/tags) version number matches the Kubernetes version (`kindest/node:vX.Y.Z` uses Kubernetes `vX.Y.Z`). To specify a Kubernetes version for your cluster, use `--image kindest/node:vX.Y.Z`. It is a good idea to use the same version as the production environment (`version` in [`LinzEksCluster` Stack](../infra/eks/cluster.ts)).

## Argo Workflows

Choose and install the Controller and Server of [a release](https://github.com/argoproj/argo-workflows/releases/) that matches the [production version (`appVersion`)](https://github.com/linz/topo-workflows/blob/master/infra/charts/argo.workflows.ts). The installation process should be described in the Argo Workflow Release page, for example for `v3.5.5`:

```bash
kubectl create namespace argo
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/download/v3.5.5/install.yaml
```

You should now be able to run a workflow, for example:

```bash
argo -n argo submit workflows/test/env.yaml
```

## Limitations

At the moment, the [Kubernetes components](../docs/infrastructure/components) configured for the production environment are not directly applicable to a local/`kind` environment as they require to run `CDK8s` using some information retrieved from AWS.
