# Topo Workflows

Topo workflows are run on a AWS EKS Cluster using [Argo Workflows](https://argoproj.github.io/argo-workflows/). The detailed configuration is available in [this repo](./infra/).

To get setup you need access to the Argo user role inside the EKS cluster, you will need to contact someone from Topo Data Engineering to get access, all Imagery maintainers will already have access.

If creating your own workflow, or interested in the details of a current workflow please also read the [CONFIGURATION.md](docs/configuration.md).

- [Setup](#setup)
- [Submitting a Job](#submitting-a-job)
- [Debugging Argo Workflows](#debugging-argo-workflows)
- [FAQ](#faq)

## Setup

You will need

- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [argo](https://github.com/argoproj/argo-workflows/releases/) - Just the `argo` cli
- [AWS CLI](https://github.com/aws/aws-cli/tree/v2?tab=readme-ov-file#installation)

Ensure you have `kubectl` aliased to `k`

```bash
alias k=kubectl
```

To connect to the EKS cluster you need to be [logged into AWS](https://toitutewhenua.atlassian.net/wiki/spaces/GEOD/pages/86418747/Login+to+AWS+Service+Accounts+via+Azure+in+Command+Line)

`aws-azure-login`

Then to setup the cluster, only the first time using the cluster you need to run this

```bash
aws --region=ap-southeast-2 eks update-kubeconfig --name=Workflows
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
k config set-context --current --namespace=argo
```

## Submitting a job

Once the cluster connection is setup a job can be submitted with the cli or accessed via the running argo-server

```bash
argo submit --watch workflows/raster/standardising.yaml
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

![WorkflowParameters](./docs/static/workflow-parameters.png)

### Workflow Logs

![WorkflowLogs](./docs/static/workflow-logs.png)

### Logs in Elasticsearch

Elasticsearch is an analytics engine, it allows us to store, search and analyse AWS logs.  
Elasticsearch can be accessed through https://myapplications.microsoft.com/.

#### Example Filters:

:warning: Make sure you are using the `workflow` data view and set the correct time filter.

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

#### Container version used

`kubernetes.container_hash` field, available in Elasticsearch, gives the container hash that was used to run the task. It allows to get the version from the container registry for further investigations.

### Workflow Artifacts

All workflow outputs and logs are stored in the artifacts bucket, in the `linz-workflows-scratch` bucket on the `li-topo-prod` account.

All outputs follow the same naming convention:

```
s3://linz-workflows-scratch/YYYY-mm/dd-workflow.name/pod.name/
```

For each pod the logs are saved as a `main.log` file within the related `pod.name` prefix.

Unless a different location is specified within the workflow code, output files will be uploaded to the corresponding `pod.name` prefix.

Note: This bucket has a 90 day expiration lifecycle.

## Running a pod on a specific node

### List the nodes

```shell
kubectl get node -n argo
ip-12-345-67-890.ap-southeast-2.compute.internal    Ready    <none>   227d   v1.30.1-eks-e564799
ip-98-765-43-210.ap-southeast-2.compute.internal    Ready    <none>   227d   v1.30.1-eks-e564799
```

### Force pod to run on the node

In the template, use the nodeSelector to specify a node to run in:

```yaml
- name: my-template
  nodeSelector:
    kubernetes.io/hostname: ip-98-765-43-210.ap-southeast-2.compute.internal
```

See the `workflows/test/sleep.yml` workflow for an example.

## Connecting to a Container

List pods:

```bash
k get pods --namespace=argo
# note: if the default namespace is set to argo, `--namespace=argo` is not required.
```

In the output next to the `NAME` of the pod, the `READY` column indicates how many Docker containers are running inside the pod. For example, `1/1` indicates there is one Docker container.

The output of the follow command includes a `Containers` section. The first line in this section is the container name, for example, `argo-server`.

```bash
k describe pods *pod_name* --namespace=argo
```

To access a container in a pod run:

```bash
k exec --namespace=argo --stdin=true --tty=true *pod_name* -- bash
```

Once inside the container you can run a number of commands.
For example, if trouble shooting network issues, you could run the following:

```bash
mtr linz-workflows-scratch.s3.ap-southeast-2.amazonaws.com
```

```bash
mtr sts.ap-southeast-2.amazonaws.com
```

```bash
watch --errexit nslookup linz-workflows-scratch.s3.ap-southeast-2.amazonaws.com
```

## Concurrency

See [Concurrency](docs/concurrency.md) for details on how to set limits on how
many workflow instances can be run concurrently.

## FAQ

> error: exec plugin: invalid apiVersion "client.authentication.k8s.io/v1alpha1"

Upgrade aws cli to > 2.7.x

## Using containers

Some tasks in the `Workflows` or `WorkflowsTemplates` use a container to run from. These containers are build from other repository, such as https://github.com/linz/topo-imagery, https://github.com/linz/argo-tasks or https://github.com/linz/basemaps.
Different tags are published for each of these containers:

- `latest`
- `vX.Y.Z`
- `vX.Y`
- `vX`

The container version are managed by a workflow parameter that needs to be specified when submitting the workflow. The default value is the last major version of the container.
Using the major version tag (`vX`) with `imagePullPolicy: Always` ensures that all minor versions are included when running a workflow using these containers.

### `:latest`

**This tag should never be used in production** as it points to the latest build of the container which could be an unstable version. We reserve this tag for testing purposes.

### `:vX.Y.Z`, `:vX.Y`, `:vX`

These tags are intended to be use in production as they will be published for each stable release of the container.

- `:vX.Y` will change dynamically as `Z` will be incremented.
- `:vX` will change dynamically as `Y` and `Z` will be incremented.

### Using different versions

For each `Workflow` and `WorkflowTemplate`, there is a parameter `version_*` that allows to specify the version of the LINZ container to use.
