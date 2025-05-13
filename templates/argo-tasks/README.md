# ArgoTasks Templates

## Contents:

- [Group](##argo-tasks/group)
- [Copy](##argo-tasks/copy)
- [Create Manifest](##argo-tasks/create-manifest)
- [Delete](##argo-task/delete)
- [Push to Github](##argo-tasks/push-to-github)
- [Generate Path](##argo-tasks/generate-path)
- [STAC setup](##argo-tasks/stac-setup)
- [STAC validate](##argo-tasks/stac-validate)
- [Identify updated items](##argo-tasks/identify-updated-items)

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
        value: '\.tiff?$|\.json$|\.tfw$'
      - name: exclude
        value: ''
      - name: flatten
        value: 'false'
      - name: group
        value: '1000'
      - name: group_size
        value: '100Gi'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
```

## argo-tasks/delete - `tpl-delete`

Template for deleting files that are `source` in a manifest
See https://github.com/linz/argo-tasks#delete

### Template usage

Delete the `source` entries in a manifest file.

```yaml
- name: delete
  templateRef:
    name: tpl-delete
    template: main
  arguments:
    parameters:
      - name: dry_run
        value: 'false'
      - name: file
        value: '{{item}}'
      - name: aws_role_config_path
        value: 's3://linz-bucket-config/config-write.topographic.json'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
  depends: 'create-manifest'
  withParam: '{{tasks.create-manifest.outputs.parameters.files}}'
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
        value: '{{tasks.generate-path.outputs.parameters.target}}'
      - name: version_argo_tasks
        value: '{{workflow.parameters.version_argo_tasks}}'
      - name: repository
        value: "{{=sprig.trimPrefix('nz-', workflow.parameters.target_bucket_name)}}"
      - name: ticket
        value: '{{=sprig.trim(workflow.parameters.ticket)}}'
      - name: copy_option
        value: '{{workflow.parameters.copy_option}}'
  depends: 'generate-path'
```

## argo-tasks/generate-path

Template to build ODR target paths using collection metadata.
See https://github.com/linz/argo-tasks#generate-paths

### Template Usage

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

## argo-tasks/stac-setup

Template to set up STAC metadata; outputs `collection-id` and `linz-slug`.
See (https://github.com/linz/argo-tasks#stac-setup)

### Template Usage

```yaml
- name: stac-setup
  templateRef:
    name: tpl-at-stac-setup
    template: main
  arguments:
    parameters:
      - name: start_datetime
        value: '{{workflow.parameters.start_datetime}}'
      - name: end_datetime
        value: '{{workflow.parameters.end_datetime}}'
      - name: gsd
        value: '{{workflow.parameters.gsd}}'
      - name: region
        value: '{{workflow.parameters.region}}'
      - name: geographic_description
        value: '{{workflow.parameters.geographic_description}}'
      - name: geospatial_category
        value: '{{workflow.parameters.geospatial_category}}'
      - name: odr_url
        value: '{{workflow.parameters.odr_url}}'
      - name: version
        value: '{{workflow.parameters.version_argo_tasks}}'
```

## argo-tasks/stac-validate

Template to validate STAC Collections and Items against [STAC](https://stacspec.org/) schemas and STAC Extension schemas.
See (https://github.com/linz/argo-tasks#stac-validate)

### Template Usage

```yaml
- name: stac-validate
  templateRef:
    name: tpl-at-stac-validate
    template: main
  arguments:
    parameters:
      - name: uri
        value: 's3://my-bucket/path/collection.json'
      - name: checksum_assets
        value: '{{workflow.parameters.checksum_assets}}'
      - name: checksum_links
        value: '{{workflow.parameters.checksum_links}}'
      - name: recursive
        value: '{{workflow.parameters.recursive}}'
      - name: concurrency
        value: '20'
```

## argo-tasks/identify-updated-items

Template to identify updated items in a STAC collection.
The output is a `file-list.json` file containing the list of mapsheets/tiles (with all associated `derived_from` files) where at least one source (derived_from) item has been changed/added/removed compared to the optional targetCollection. If targetCollection has not been specified, all items will be considered "new".
The format of `file-list.json` is equivalent to `mapsheet-coverage` and `tile-index-validate` outputs.

### Template Usage

```yaml
- name: identify-updated-items
  templateRef:
    name: tpl-at-identify-updated-items
    template: main
  arguments:
    parameters:
      - name: targetCollection
        value: '{{= inputs.parameters.odr_url == "" ? "" : sprig.trimSuffix("/", inputs.parameters.odr_url) + "/collection.json" }}'
      - name: sourceCollections
        value: '{{= inputs.parameters.base_layer_source == "" ? "" : sprig.trimSuffix("/", inputs.parameters.base_layer_source) + "/collection.json;" }}{{=sprig.trimSuffix("/", inputs.parameters.top_layer_source)}}/collection.json'
      - name: version
        value: '{{= inputs.parameters.version_argo_tasks}}'
```

Sample output:
`file-list.json`

```json
[
  {
    "output": "BD31",
    "input": ["s3://path/to/dem_8m/BD31.tiff", "s3://path/to/dem_1m/BD31.tiff"],
    "includeDerived": true
  },
  {
    "output": "BD32",
    "input": ["s3://path/to/dem_8m/BD32.tiff", "s3://path/to/dem_1m/BD32.tiff"],
    "includeDerived": true
  }
]
```
