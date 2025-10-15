# Common Templates

- [Log Notification](##log-notification---tpl-log-notification)
- [Get Location](##get-location---tpl-get-location)
- [Read File](##read-file---tpl-read-file)

## Log Notification - `tpl-log-notification`

This template is used to emit structured logs for key events. The logs being ingested into Elasticsearch, where Watchers look for specific log patterns or fields to trigger notifications. 

This template can be used for handling a workflow `onExit`.
See <https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/>
The script run by this template as an exit handler is generating a log, including the status of the workflow, its parameters, and a customisable message, in the following format:

```json
{
  "time": 1722568553969,
  "level": 20,
  "pid": 1,
  "msg": "Workflow:Done",
  "workflowStatus": "Succeeded",
  "parameters": {
    "version_argo_tasks": "v4",
    "version_basemaps_cli": "v8",
    "version_topo_imagery": "v4",
    "ticket": "",
    "region": "new-zealand",
    "source": "s3://linz-imagery-staging/test/sample/",
    "include": ".tiff?$",
    "scale": "500",
    "validate": "false",
    "retile": "false",
    "source_epsg": "2193",
    "target_epsg": "2193",
    "group": "50",
    "compression": "webp",
    "create_capture_area": "false",
    "cutline": "",
    "collection_id": "",
    "category": "urban-aerial-photos",
    "gsd": "0.3m",
    "producer": "Unknown",
    "producer_list": "",
    "licensor": "Unknown",
    "licensor_list": "",
    "start_datetime": "2024-08-02",
    "end_datetime": "2024-08-02",
    "geographic_description": "",
    "lifecycle": "completed",
    "event": "",
    "historic_survey_number": "",
    "publish_to_odr": "false",
    "target_bucket_name": "",
    "copy_option": "--no-clobber"
  }
}
```

This template can also be used as a step or dag task to add custom parameters to a log file, in the following format:

```json
{
  "time": 1722568553969,
  "level": 20,
  "pid": 1,
  "msg": "UnarchiveCopy:Done",
  "workflowStatus": "Running",
  "parameters": {
    "restore_location": "s3://linz-topographic-shared/linz/surveys/SN9937/",
    "archive_bucket": "s3://linz-topographic-archive",
    "consumer": "linz"
  }
}
```

### Template usage

The information to pass to this `WorkflowTemplate` is the status, the parameters of the workflow (`workflow.status` & `workflow.parameters` or custom parameters), and an optional status message (`msg`).

Example using the `onExit` event [does not handle a `templateRef`](https://github.com/argoproj/argo-workflows/issues/3188),
an additional template called by the `onExit` event has to be added to the templates so it can finally call the `tpl-log-notification` template.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: hello-world-
spec:
  entrypoint: hello
  onExit: exit-handler
  arguments:
    parameters:
      - name: message
        value: Hello world!
  templates:
    - name: hello
      inputs:
        parameters:
          - name: message
      container:
        image: alpine:latest
        command: [sh, -c]
        args: ['echo {{inputs.parameters.message}}']

    - name: exit-handler
      steps:
        - - name: exit
            templateRef:
              name: tpl-log-notification
              template: main
            arguments:
              parameters:
                - name: workflow_status
                  value: '{{workflow.status}}'
                - name: workflow_parameters
                  value: '{{workflow.parameters}}'
```

Example of supplying custom parameters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: example-log-notification-
spec:
  entrypoint: main
  arguments:
    parameters:
      - name: custom_parameter
        value: Hello world!
  templates:
    - name: main
      inputs:
        parameters:
          - name: custom_parameter
      dag:
        tasks:
          - name: generate-parameters
            template: generate-parameters
            arguments:
              parameters:
                - name: custom_parameter
                  value: '{{inputs.parameters.custom_parameter}}'
          - name: notify
            templateRef:
              name: tpl-log-notification
              template: main
            arguments:
              parameters:
                - name: msg
                  value: 'Workflow:Done:CustomMessage'
                - name: workflow_status
                  value: '{{workflow.status}}'
                - name: workflow_parameters
                  value: '{{tasks.create-parameters.outputs.parameters.custom_parameters}}'
            depends: 'generate-parameters.Succeeded'

    - name: generate-parameters
      inputs:
        parameters:
          - name: custom_parameter
      container:
        image: public.ecr.aws/aws-cli/aws-cli:2.27.62
        command: [sh, -c]
        args:
          - |
            jq -nc '
              [
                {name: "restore_location", value: "{{inputs.parameters.custom_parameter}}"}
              ]
            ' > /tmp/custom-parameters
      outputs:
        parameters:
          - name: custom_parameters
            valueFrom:
              path: '/tmp/custom-parameters'
```

## Get Location - `tpl-get-location`

Template to output the S3 Archive location for the workflow (example: `s3://linz-workflows-scratch/2024-10/02-my-workflow-29l4x/`).
In some cases, we need this location to write output files by the workflow in a specific and consistent "folder" within the archive bucket.

## Read File - `tpl-read-file`

Template to copy a file from an AWS S3 location to the local filesystem and output the file contents as a workflow parameter.

Example usage:

```yaml
- name: read-copy-manifest
  templateRef:
    name: tpl-read-file
    template: main
  arguments:
    parameters:
      - name: location
        value: '{{inputs.parameters.restore_copy_manifest)}}'
```
