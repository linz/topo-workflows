# Topo Workflows

Topo workflows are run on a AWS EKS Cluster using [Argo Workflows](https://argoproj.github.io/argo-workflows/)

To get setup you need access to the Argo user role inside the EKS cluster, you will need to contact someone from Topo Data Engineering to get access, all Imagery maintainers will already have access.

If creating your own workflow, or interested in understanding the details of a current workflow please also read the [CONFIGURATION.md](./CONFIGURATION.md).

- [Setup](#setup)
- [Submitting a Job](#submitting-a-job)
- [Debugging Argo Workflows](#debugging-argo-workflows)
- [FAQ](#faq)

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

## Submitting a job

Once the cluster connection is setup a job can be submitted with the cli or accessed via the running argo-server

```bash
argo submit --watch workflows/imagery/standardising.yaml
```

To open the web interface:

```bash
# Create a connection to the Argo server
k port-forward deployment/argo-workflows-server 2746:2746

xdg-open http://localhost:2746
```

### Submit a Job Using the Argo UI

In the **Workflows** page:

1. `SUBMIT NEW WORKFLOW`
2. `Edit using full workflow options`
3. `UPLOAD FILE`
4. _(Locate File -> Open)_
5. `+ CREATE`

## Debugging Argo Workflows

### Workflow Parameters

![WorkflowParameters](/docs/workflow_parameters.png)

### Workflow Logs

![WorkflowLogs](/docs/workflow_logs.png)

### Logs in Elasticsearch

Elasticsearch is an analytics engine, it allows us to store, search and analyse AWS logs.  
Elasticsearch can be accessed through https://myapplications.microsoft.com/

#### Example Filters:

:warning: Make sure you are using `li-topo-production*` and set the correct time filter.

_All Logs for a Workflow:_

```
kubernetes.labels.workflows.argoproj.io/workflow : "imagery-standardising-v0.2.0-60-9b7dq"
```

_All Logs for a pod:_  
Click on the pod in the Argo UI and scroll through the summary table to find the pod name.

```
kubernetes.annotations.workflows.argoproj.io/node-name.keyword : "imagery-standardising-v0.2.0-60-9b7dq.create-config"
```

_List Failed Stac Validation Logs:_

```
kubernetes.labels.workflows.argoproj.io/workflow : "imagery-standardising-v0.2.0-60-9b7dq" and data.valid : False
```

_Find a Basemaps URL:_

```
kubernetes.labels.workflows.argoproj.io/workflow : "imagery-standardising-v0.2.0-60-9b7dq" and data.url : *
```

or

```
data.title : "Wellington Urban Aerial Photos (1987-1988) SN8790" and data.url : *
```

### Workflow Artifacts

All workflow outputs and logs are stored in the artifacts bucket, in the `linz-workflow-artifacts` bucket on the `li-topo-prod` account.

All outputs follow the same naming convention:

```
s3://linz-workflow-artifacts/YYYY-mm/dd-workflow.name/pod.name/
```

For each pod the logs are saved as a `main.log` file within the related `pod.name` prefix.

Unless a different location is specified within the workflow code, output files will be uploaded to the corresponding `pod.name` prefix.

Note: This bucket has a 90 day expiration lifecycle.

## Connecting to a Container

List pods:

```bash
k get pods -n argo
# note: if the default namespace is set to argo, `-n argo` is not required.
```

In the output next to the `NAME` of the pod, the `READY` column indicates how many Docker containers are running inside the pod. For example, `1/1` indicates there is one Docker container.

The output of the follow command includes a `Containers` section. The first line in this section is the container name, for example, `argo-server`.

```bash
k describe pods *pod_name* -n argo
```

To access a container in a pod run:

```bash
k exec -it -n argo *pod_name* -- /bash/bash
```

Once inside the container you can run a number of commands.
For example, if trouble shooting network issues, you could run the following:

```bash
mtr linz-workflow-artifacts.s3.ap-southeast-2.amazonaws.com
```

```bash
mtr sts.ap-southeast-2.amazonaws.com
```

```bash
watch -e nslookup linz-workflow-artifacts.s3.ap-southeast-2.amazonaws.com
```

## FAQ

> error: exec plugin: invalid apiVersion "client.authentication.k8s.io/v1alpha1"

Upgrade aws cli to > 2.7.x
