# Common Templates

## Exit Handler - `tpl-exit-handler`

Template for handling a workflow `onExit`.
See <https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/>
The script ran by this template is generating a log, including the status of the workflow and its parameters, with the following format:

```json
{
  "time": 1722568553969,
  "level": 20,
  "pid": 1,
  "msg": "Workflow:Succeeded",
  "version_argo_tasks": "v4",
  "version_basemaps_cli": "v7",
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
```

### Template usage

The information to pass to this `WorkflowTemplate` is the status and the parameters of the workflow (`workflow.status` & `workflow.parameters`).

As the `onExit` event [does not handle a `templateRef`](https://github.com/argoproj/argo-workflows/issues/3188),
an additional template called by the `onExit` event has to be added to the templates so it can finally call the `tpl-exit-handler` template.

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
              name: tpl-exit-handler
              template: main
            arguments:
              parameters:
                - name: workflow_status
                  value: '{{workflow.status}}'
                - name: workflow_parameters
                  value: '{{workflow.parameters}}'
```

## Get Location - `tpl-get-location`

Template to output the S3 Archive location for the workflow (example: `s3://linz-workflows-scratch/2024-10/02-my-workflow-29l4x/`).
In some cases, we need this location to write output files by the workflow in a specific and consistent "folder" within the archive bucket.
