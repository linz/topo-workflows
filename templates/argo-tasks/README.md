# ArgoTasks Templates

## Contents:

- [Group](##argo-tasks/group)
- [Copy](##argo-tasks/copy)
- [Create Manifest](##argo-tasks/create-manifest)
- [Push to Github](##argo-tasks/push-to-github)
- [Generate Path](##argo-tasks/generate-path)

## argo-tasks/group - `tpl-at-group`

Group inputs into outputs to be used with `withParam` to run one task per grouping

### Template usage

Group the output of `tile-index-validate` into groups of size 5

```yaml
- name: group
  templateRef:
    name: tpl-at-group
    template: main

  arguments:
    artifacts:
    - name: input
        from: "{{ tasks.tile-index-validate.outputs.artifacts.files }}"

    parameters:
    - name: size
        value: 5

  depends: "tile-index-validate"
```

### Consumer usage

Using `withParams` to spin up a number of tasks from

```yaml
# ...

steps:
  # consume the output of a grouper
  - - name: consume
      template: consume
      arguments:
        parameters:
          - name: group_id
            value: "{{item}}" # groupId eg "000", "001", "002" etc..

        # All the grouped data as a folder
        artifacts:
          - name: group_data
            from: "{{ steps.group.outputs.artifacts.output }}"

      withParam: "{{ steps.group.outputs.parameters.output }}"

# ...

- name: consume
  inputs:
    # Id of the grouping file to consume
    # to be used with `group_data`
    parameters:
    - name: group_id # "000", "001" ... etc

    # grouped input data for the consumer, this will be a folder full of JSON files
    # one file per groupId
    artifacts:
    - name: group_data
      path: /tmp/input/

    parameters:
    - name: group_id # "000", "001" ... etc

  script:
    image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/argo-tasks:latest"
    command: [bash]
    source: |
      echo {{ inputs.parameters.group_id}}
      ls -alh /tmp/input/

      # for example using with a --from-file
      # ./test-cli --from-file=/tmp/group/input/{{inputs.parameters.group_id}}.json
```

## argo-tasks/copy - `tpl-copy`

Template for copying a manifest of files between two locations.  
See https://github.com/linz/argo-tasks#copy

### Template usage

Copy the input parameter manifest file without overriding.

```yaml
- name: copy
  templateRef:
    name: tpl-copy
    template: main
  arguments:
    parameters:
      - name: copy_option
        value: '--no-clobber'
      - name: file
        value: '{{item}}'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
  depends: 'create-manifest'
  withParam: '{{tasks.create-manifest.outputs.parameters.files}}'
```

## argo-tasks/create-manifest - `tpl-create-manifest`

Template for creating a manifest to be copied and their target path.  
See https://github.com/linz/argo-tasks#create-manifest

### Template usage

Create a manifest file for a user specified source and target that includes `.tiff`, `.json`, and `.tfw` files from the source.

```yaml
- name: create-manifest
  templateRef:
    name: tpl-create-manifest
    template: main
  arguments:
    parameters:
      - name: source
        value: '{{inputs.parameters.source}}'
      - name: target
        value: '{{workflow.parameters.target}}'
      - name: include
        value: '\\.tiff?$|\\.json$|\\.tfw$'
      - name: exclude
        value: ''
      - name: group
        value: '1000'
      - name: group_size
        value: '100Gi'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
```

## argo-tasks/push-to-github - `tpl-push-to-github`

Template for Formatting and Pushing STAC Collections to Github
See https://github.com/linz/argo-tasks#stac-github-import

### Template usage

```yaml
- name: push-to-github
  templateRef:
    name: tpl-push-to-github
    template: main
  arguments:
    parameters:
      - name: source
        value: '{{inputs.parameters.source}}'
      - name: target
        value: '{{workflow.parameters.target}}'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
      - name: repository
        value: 'elevation'
  depends: 'copy-with-github'
```

## argo-tasks/generate-path

Template to build ODR target paths using collection metadata.
See https://github.com/linz/argo-tasks#generate-paths

## Template Usage

```yaml
name: generate-path
templateRef:
  name: tpl-at-generate-path
  template: main
arguments:
  parameters:
    - name: version
      value: '{{workflow.parameters.version_argo_tasks}}'
    - name: target_bucket_name
      value: '{{inputs.parameters.target_bucket_name}}'
    - name: source
      value: '{{inputs.parameters.source}}'
```
