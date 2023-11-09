# Argo Workflows Training Workshop

## Workshop Aims

To learn how to build, run and monitor Argo workflows in order to be able to create new scripts.

## Workshop Contents

- [Workshop Pre-Requisites](#workshop-pre-requisites)
- [Getting help from TDE](#getting-help-from-tde)
- [Introduction to the tech ecosystem: containerisation, Kubernetes, Argo Workflows](#introduction-to-the-tech-ecosystem-containerisation-argo-workflows-kubernetes-and-aws-elastic-kubernetes-service)
- [The structure of an Argo workflow](#what-is-a-workflow)
- [The codebase and containers behind the Topo workflows](#the-codebase-and-containers-behind-the-topo-workflows)
- [Creating and running workflows from the UI](#creating-and-running-workflows)
- [Creating and running workflows from the command line](#creating-and-running-workflows-from-the-cli)
- [Monitoring your running workflows - how to view logs and get Kubernetes events](#monitoring-your-running-workflows---how-to-view-logs-and-get-events)
- [Workflow Concepts: more exercises](#workflow-concepts---more-exercises)
  - [Arguments and multiple tasks](#ui-hello-world-example-with-arguments-containing-two-tasks)
  - [DAGs and dependent tasks](#dag-example---dependent-tasks)
  - [Inputs and Outputs](#inputs-and-outputs---passing-information-between-tasks-in-a-workflow)
  - [Parallelisation](#parallelising-a-task-to-run-in-multiple-pods)
- [How the Topo workflows are structured – example using the standardising workflow](#a-workflow-example-standardising-workflow)
- [Other features to note beyond the scope of this workshop](#other-features-to-note-beyond-the-scope-of-this-workshop)
- [Argo Workflows Resources](#argo-workflows-resources)
- [Need more help?](#need-more-help)

## Workshop Pre-Requisites

### AWS CLI v2

[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Install Git CLI and clone the Topo Workflows GitHub repository

```bash
sudo apt-get update
sudo apt-get install git
git clone https://github.com/linz/topo-workflows.git
```

This will create a copy of the Topo Workflows repository locally.

### `kubectl`

[https://kubernetes.io/docs/tasks/tools/](https://kubernetes.io/docs/tasks/tools/)

### Argo CLI

[https://github.com/argoproj/argo-workflows/releases/](https://github.com/argoproj/argo-workflows/releases/)

## Getting help from TDE

Ask on the `#team-li-geospatial-data-engineering` Slack channel :smile:

If you have a question about a particular Workflow that has run on Argo, you can tag `@squad-de-dev` in the relevant thread in the `#alert-argo-workflows` Slack channel.

## Introduction to the tech ecosystem: containerisation, Argo Workflows, Kubernetes and AWS Elastic Kubernetes Service

A workflow running in Argo:

![Argo Workflow UI](images/workflow-ui.png)

The infrastructure running Argo Workflows:

![Kubernetes and Argo Workflows](images/pods.png)

For more in-depth information, see:
[Argo Configuration Guide - Introduction to Argo Workflows](../configuration.md#IntroductiontotheArgoWorkflowsEnvironment)

## What is a Workflow?

A workflow is a grouping of tasks to be run. It is a YAML (or JSON) document that specifies the tasks to be carried out and the settings that should be applied to the workflow and the tasks. The workflow document is submitted to Argo and is scheduled and run using AWS EC2 resources that are dynamically requested and assigned.

Workflow structure concepts (see diagram below):

- Workflow
- WorkflowSpec
- Templates (e.g. container, script)
- Template Invocators (e.g. dag: task)

![Simplified Workflow Structure](images/wf-structure.png)

This diagram is simplified and we will look at a more detailed, real-world, example later on.

## The codebase and containers behind the Topo workflows

Templates specify a container image for a pod to use.

All the examples in this workshop will use our Topo containers.

| **Container**                                                                    | **Purpose**                                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [topo-imagery](https://github.com/linz/topo-imagery/pkgs/container/topo-imagery) | Python scripts that need to use the GDAL library and geospatial Python libraries. |
| [argo-tasks](https://github.com/linz/argo-tasks/pkgs/container/argo-tasks)       | Reusable utility tasks written in TypeScript.                                     |
| [basemaps-cli](https://github.com/linz/basemaps/pkgs/container/basemaps%2Fcli)   | Controls Basemaps configuration.                                                  |

## Creating and running workflows

### Running workflows from the UI

A note: `Workflows` and `WorkflowTemplates`.

We are working with documents of the kind "Workflow" in this workshop. Workflows can be submitted directly, or can be submitted using a "WorkflowTemplate". This is useful for Workflows that will run with different parameters but are otherwise running the same tasks.

### UI "hello world" example

There are simpler ways to do this, but this is more consistent with our workflows. For example: we could specify the container in the main template as there is only one task.

Also, we are going to use DAG (directed acyclic graph) and "tasks", instead of "steps". Steps are similar to using dag/tasks, but not as flexible, taking the form of a list of lists.

Create a new file called `wf_hello_world.yaml` containing the following YAML:

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-hello-world-
  namespace: argo
spec:
  nodeSelector:
    karpenter.sh/capacity-type: 'spot'
  entrypoint: main
  templates:
    - name: main
      dag:
        tasks:
          - name: say-hello-task
            template: say-hello-template
    - name: say-hello-template
      container:
        image: '019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/topo-imagery:v3'
        command: [echo]
        args: ['hello world']
```

Example workflow file: [wf_hello_world.yaml](example_workflows/wf_hello_world.yaml)

**Spot Instances**:

You will see the following specified in the example workflows for this workshop. There are two types of AWS EC2 machine requests, "spot" and "on-demand". Spot instances cost less to run, but they may not be available as promptly as on-demand.

```yaml
nodeSelector:
  karpenter.sh/capacity-type: 'spot'
```

Note: prefixing the name of the workflow with `test-` prevents alerts for the workflow being sent to the `#alert-argo-workflows` Slack channel.

Submit the workflow through the UI:
"+ SUBMIT NEW WORKFLOW" > "Edit using full workflow options" > "UPLOAD FILE" > "+ CREATE".

![Submitting a new workflow](images/argo-ui-submit-new-workflow.png)

The completed workflow should look like this in the Argo UI:

![Hello World example](images/wf-hello-world.png)

### "hello world" example with argument parameter

**Parameters** are fundamental to Argo Workflows. They are used to pass information throughout the Workflow, for example argument parameters are passed through from the workflow spec to the templates. Input parameters in templates can get information from workflow parameters and the output parameters from other templates.

Below is an example of parameters when submitting the Standardising workflow in the UI:

![Standardising workflow parameters](images/standardising-parameters.png)

Parameters are referenced using **Argo variables**.

For example, a workflow argument parameter might look like this:

```yaml
spec:
  entrypoint: main
  arguments:
    parameters:
      - name: message
        value: 'hello world'
```

The parameter can be referenced in the workflow using Argo variables as `"{{workflow.parameters.message}}"`

Create a new file called `wf_hello_world_args.yaml` containing the following YAML:

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-hello-world-args-
  namespace: argo
spec:
  nodeSelector:
    karpenter.sh/capacity-type: "spot"
  entrypoint: main
  arguments:
    parameters:
      - name: message
        value: "hello world"
  templates:
    - name: main
      dag:
        tasks:
          - name: say-hello-task
            template: say-hello-template
            arguments:
              parameters:
              - name: message
                  value: "{{workflow.parameters.message}}"
    - name: say-hello-template
      inputs:
        parameters:
          - name: message
      container:
        image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/topo-imagery:v3"
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

Example workflow file: [wf_hello_world_args.yaml](example_workflows/wf_hello_world_args.yaml)

Submit it through the UI.

The completed workflow should look like this in the Argo UI:

![Hello World Args example](images/wf-hello-world-args.png)

### Creating and running workflows from the CLI

Submitting Workflows through the CLI is particularly useful if you need to run many similar workflows with different parameters.

In a terminal window, log in to `li-topo-prod` using AWS CLI.

Check your connection to Argo:

```bash
kubectl get pods -n argo
argo list -n argo
```

In the above commands, `-n argo` means specify the argo "namespace". This is a way of separating Kubernetes pods into different areas. In our environment, these are only used for functions of the infrastructure, e.g. server functions or monitoring. You can try the commands with the option `-A` to specify all namespaces instead of `-n argo` and see which other pods are running.

For Argo CLI, you can set the environment variable `ARGO_NAMESPACE=argo` so you don’t have to specify the namespace in your argo commands.

You can also do that for kubectl if you want to:
`kubectl config set-context --current --namespace=argo`

### CLI "hello world" example

```bash
argo submit docs/training_workshop/example_workflows/wf_hello_world.yaml -n argo --watch
```

![Hello World CLI example](images/cli-hello-world.png)

### CLI "hello world" example with argument parameters

```bash
argo submit docs/training_workshop/example_workflows/wf_hello_world_args.yaml -p message1="hello world" --watch
```

![Hello World Args CLI example](images/cli-hello-world-args.png)

**Using a parameters file:** If there are many parameters in a workflow, the parameters can be placed in a separate YAML file which can be referenced when submitting the workflow on the CLI. For example:

```bash
argo submit topo-workflows/imagery/standardising-publish-import.yaml -n argo -f params.yaml
```

_params.yaml_:

```yaml
source: 's3://linz-imagery-source-example/aerial-imagery/new-zealand/christchurch_urban_2021_0.05m_RGB/'
target: 's3://linz-imagery-example/canterbury/christchurch_2021_0.05m/rgb/2193/'
scale: '500'
group: '29'
cutline: 's3://linz-imagery-cutline-example/historical-imagery-cutlines/2023-01-16_84fd68f/SNC50451-combined.fgb'
title: 'Christchurch 0.05m Urban Aerial Photos (2021)'
description: 'Orthophotography within the Canterbury region captured in the 2021 flying season.'
producer: 'Aerial Surveys'
licensor: 'Toitū Te Whenua Land Information New Zealand'
start-datetime: '2021-11-02'
end-datetime: '2021-12-02'
```

> **_Resources:_** [Argo CLI documentation](https://argoproj.github.io/argo-workflows/cli/argo/) - [Kubernetes Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

### Monitoring your running workflows - how to view logs and get events

### Slack

Some generic and specific alerts have been configured to happen in `#alert-argo-workflows`:

- Workflow Started/Completed/Failed
- Non Visual QA report / Basemaps links

### Argo UI

The application logs are accessible in the Argo UI Workflow page in the task description (by clicking on one of the task/pod - `SUMMARY` tab):
![Workflows logs](images/argo-ui-show-logs.png)

They are also downloadable in the `INPUTS/OUTPUTS` tab as `main.log`.

### Pod

You can view the logs for a pods in "live" with the following command:

```bash
kubectl logs POD_NAME -n NAMESPACE --follow
```

### Kubernetes events

Events represent a state change of a k8s resource (examples: `Pod CREATED`, `Container PULLED` or `WorkflowRunning`). The events are available during 60 minutes with the following command:

```bash
kubectl get events -n argo
```

Some filters can be applied:

- `--sort-by=.metadata.creationTimestamp` to sort them in chronological order
- `--types=Warning` to show only the warnings
  Older events (more than 60 minutes) are still available in Elastic Search (see next section).

### Elastic Search

The logs and events that are output by the Argo Workflows ecosystem are accessible inside Elastic Search. Elastic Search allows the user to execute queries. It contains application logs and system events at the same place.

## Workflow Concepts - more exercises

### UI "hello world" example with arguments containing two tasks

This workflow will run two tasks at the same time. In this case we are using the same "say-hello-template" template. These tasks could reference different templates.

Add another task to `wf_hello_world_args.yaml` and another parameter for it.

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-hello-world-args-tasks-
  namespace: argo
spec:
  nodeSelector:
    karpenter.sh/capacity-type: 'spot'
  entrypoint: main
  arguments:
    parameters:
      - name: message1
        value: 'hello world 1'
      - name: message2
        value: 'hello world 2'
  templates:
    - name: main
      dag:
        tasks:
          - name: say-hello-task1
            template: say-hello-template
            arguments:
              parameters:
                - name: message
                  value: '{{workflow.parameters.message1}}'
          - name: say-hello-task2
            template: say-hello-template
            arguments:
              parameters:
                - name: message
                  value: '{{workflow.parameters.message2}}'
    - name: say-hello-template
      inputs:
        parameters:
          - name: message
      container:
        image: '019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/topo-imagery:v3'
        command: [echo]
        args: ['{{inputs.parameters.message}}']
```

Example workflow file: [wf_hello_world_args_tasks.yaml](example_workflows/wf_hello_world_args_tasks.yaml)

Submit the workflow through the CLI.

The completed workflow should look like this in the Argo UI:

![Hello World Args and Tasks example](images/wf-hello-world-args-tasks.png)

### DAG example - dependent tasks

`depends` is used to make sure that dag tasks run in a particular order.

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-hello-world-dag-
  namespace: argo
spec:
  nodeSelector:
    karpenter.sh/capacity-type: "spot"
  entrypoint: main
  arguments:
    parameters:
      - name: message1
        value: "hello world 1"
      - name: message2
        value: "hello world 2"
  templates:
    - name: main
      dag:
        tasks:
          - name: say-hello-task1
            template: say-hello-template
            arguments:
              parameters:
                - name: message
                  value: "{{workflow.parameters.message1}}"
          - name: say-hello-task2
            template: say-hello-template
            arguments:
              parameters:
                - name: message
                  value: "{{workflow.parameters.message2}}"
            depends: "say-hello-task1"
          - name: say-hello-task3
            template: say-hello-template
            arguments:
              parameters:
                - name: message
                  value: "say hello task 3"
            depends: "say-hello-task1"
          - name: say-hello-task4
            template: say-hello-template
            arguments:
`wf_hello_world_args_tasks.yaml`
              parameters:
                - name: message
                  value: "say hello task 4"
            depends: "say-hello-task2 && say-hello-task3"
    - name: say-hello-template
      inputs:
        parameters:
          - name: message
      container:
        image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/topo-imagery:v3"
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

Example workflow file: [wf_hello_world_dag.yaml](example_workflows/wf_hello_world_dag.yaml)

Submit the workflow.

The completed workflow should look like this in the Argo UI:

![Hello World DAG example](images/wf-hello-world-dag.png)

### Inputs and Outputs - passing information between tasks in a Workflow

The outputs of one task can be passed as inputs to other tasks using parameters, artifacts, or custom code.

For more in-depth information, see:
[Argo Configuration Guide - Introduction to Argo Workflows](../configuration.md#IntroductiontotheArgoWorkflowsEnvironment)

### Parallelising a task to run in multiple pods

The example below uses `{{item}}` to run pods in parallel. This expands a single workflow task into multiple parallel steps using a list output from a previous task. It also passes the output from the `aws-list` task to the `stac-print-path` task.

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-output-parallel-
spec:
  nodeSelector:
    karpenter.sh/capacity-type: "spot"
  parallelism: 20
  nodeSelector:
    karpenter.sh/capacity-type: "spot"
  serviceAccountName: workflow-runner-sa
  entrypoint: main
  arguments:
    parameters:
      - name: uri
        value: "s3://linz-imagery-staging/test/stac-validate/"
  templateDefaults:
    container:
      imagePullPolicy: Always
  templates:
    - name: main
      dag:
        tasks:
          - name: aws-list
            template: aws-list
            arguments:
              parameters:
                - name: uri
                  value: "{{workflow.parameters.uri}}"
                - name: include
                  value: "json$"
          - name: stac-print-path
            template: stac-print-path
            arguments:
              parameters:
                - name: file
                  value: "{{item}}"
            depends: "aws-list"
            withParam: "{{tasks.aws-list.outputs.parameters.files}}"
    - name: aws-list
      inputs:
        parameters:
          - name: uri
          - name: include
      container:
        image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/argo-tasks:v2"
        command: [node, /app/index.js]
        env:
          - name: AWS_ROLE_CONFIG_PATH
            value: s3://linz-bucket-config/config.json
        args:
          [
            "list",
            "--verbose",
            "--include",
            "{{inputs.parameters.include}}",
            "--group",
            "4",
            "--output",
            "/tmp/file_list.json",
            "{{inputs.parameters.uri}}",
          ]
      outputs:
        parameters:
          - name: files
            valueFrom:
              path: /tmp/file_list.json
    - name: stac-print-path
      inputs:
        parameters:
          - name: file
      script:
        image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/argo-tasks:v2"
        env:
          - name: AWS_ROLE_CONFIG_PATH
            value: s3://linz-bucket-config/config.json
        command:
          - "bash"
        source: |
          PATH_OUT=$(echo "{{inputs.parameters.file}}" | sed 's/,/ /g; s/\[/ /g; s/\]/ /g')
          echo $PATH_OUT
```

Example workflow file: [wf_output_parallel.yaml](example_workflows/wf_output_parallel.yaml)

The output should look like this in the Argo UI:

![Parallel Output](images/parallel-output.png)

### A note about performance and scaling workflows

> Refer to the [Argo Configuration Guide](../configuration.md) to learn about how to optimise the performance of your workflows.

## A Workflow example: Standardising Workflow

General structure (YAML):

![Standardising Workflow Structure - YAML](images/standardising-structure.png)

Compare the structure shown above with the Argo Workflows UI view:
(TODO: Update screenshot with `standardising` workflow using `topo-imagery` `v2`)

![Standardising Workflow Structure - GUI](images/standardising-argo-ui.png)

Now check out in the YAML file [standardising.yaml](../../workflows/imagery/standardising.yaml):

- how inputs and outputs are passed between tasks
- dependencies
- the use of multiple containers
- the use of Argo variables to substitute values

## Other features to note (beyond the scope of this Workshop)

Once you are confident submitting and creating basic workflows, explore the following concepts online:

- Artifacts
- Conditionals
- Referencing other Workflows/WorkflowTemplates. For an example, see [standardising-publish-import.yaml](../../workflows/imagery/standardising-publish-import.yaml)
- Sprig scripting

## Argo Workflows Resources

> [Argo Workflows User Guide](https://argoproj.github.io/argo-workflows/workflow-concepts/) > [Argo Workflows Examples](https://github.com/argoproj/argo-workflows/tree/master/examples)

[Argo Workflows Online Training Courses](https://killercoda.com/pipekit/course/argo-workflows/)
Recommended for further information about:

- Templates
- Inputs and Outputs
- Reusing Workflows

## Need more help?

Ask on the `#team-li-geospatial-data-engineering` Slack channel :smile:
