# Topo Workflows

Topo workflows are run on a AWS EKS Cluster using [Argo Workflows](https://argoproj.github.io/argo-workflows/)

To get setup you need access to the Argo user role inside the EKS cluster, you will need to contact someone from Topo Data Engineering to get access

## Setup

You will need

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [argo](https://github.com/argoproj/argo-workflows/releases/)

Ensure you have `kubectl` aliased to `k`

```bash
alias k=kubectl
```

To connect to the EKS cluster you need to be logged into AWS

`aws-azure-login :account-name`

Then to setup the cluster, only the first time using the cluster you need to run this

You will need a AWS CLI > 2.7.x

```bash
aws eks update-kubeconfig --name Workflow --region ap-southeast-2 # no role arn needed if you are already the right role

aws eks update-kubeconfig --name Workflow --region ap-southeast-2 --role-arn arn:aws:iam::...
```

to validate the cluster is connected, 

```
k get nodes
```

to make the cli access easier you can set the default namespace to `argo`

```
k config set-context --current  --namespace=argo
```


# Submitting a job

Once the cluster connection is setup a job can be sumbitted with the cli or accessed via the running argo-server

```bash
argo submit --watch workflows/imagery/standardising.yaml
```

Web interface
```bash
# Create a connection to the argo server
k port-forward deployment/argo-workflows-server 2746:2746

xdg-open http://localhost:2746
```



### FAQ

> error: exec plugin: invalid apiVersion "client.authentication.k8s.io/v1alpha1"

Upgrade aws cli to > 2.7.x