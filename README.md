# Topo Workflows

Topo workflows are run on a AWS EKS Cluster using [Argo Workflows](https://argoproj.github.io/argo-workflows/)

To get setup you need access to the Argo user role inside the EKS cluster, you will need to contact someone from Topo Data Engineering to get access, all Imagery maintainers will already have access.

## Setup

You will need

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [argo](https://github.com/argoproj/argo-workflows/releases/) - Just the `argo` cli

Ensure you have `kubectl` aliased to `k`

```bash
alias k=kubectl
```

To connect to the EKS cluster you need to be logged into AWS

`aws-azure-login :account-name`

Then to setup the cluster, only the first time using the cluster you need to run this

You will need a AWS CLI > 2.7.x

```bash

# For Imagery maintainers you will already have the correct role so no role arn is needed.
aws eks update-kubeconfig --name Workflow --region ap-southeast-2

# For AWS Admin users you will need to find the correct EKS role to use
aws eks update-kubeconfig --name Workflow --region ap-southeast-2 --role-arn arn:aws:iam::...
```

to validate the cluster is connected,

```bash
k get nodes

NAME                                               STATUS   ROLES    AGE    VERSION
ip-255-100-38-100.ap-southeast-2.compute.internal   Ready    <none>   7d   v1.21.12-eks-5308cf7
ip-255-100-39-100.ap-southeast-2.compute.internal   Ready    <none>   7d   v1.21.12-eks-5308cf7
```

to make the cli access easier you can set the default namespace to `argo`

```bash
k config set-context --current  --namespace=argo
```

# Submitting a job

Once the cluster connection is setup a job can be sumbitted with the cli or accessed via the running argo-server

```bash
argo submit --watch workflows/imagery/standardising.yaml
```

To open the web interface:

```bash
# Create a connection to the Argo server
k port-forward deployment/argo-workflows-server 2746:2746

xdg-open http://localhost:2746
```

## Submit a Job Using the Argo UI

In the **Workflows** page:

1. `SUBMIT NEW WORKFLOW`
2. `Edit using full workflow options`
3. `UPLOAD FILE`
4. _(Locate File -> Open)_
5. `+ CREATE`

### FAQ

> error: exec plugin: invalid apiVersion "client.authentication.k8s.io/v1alpha1"

Upgrade aws cli to > 2.7.x
