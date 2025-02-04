# Topo-Imagery templates

## Contents:

- [Standardise Validate](##topo-imagery/standardise-validate)

## topo-imagery/standardise-validate - `tpl-ti-standardise-validate`

Template for TIFF standardisation and non-visual QA.

See [standardise-validate.py](https://github.com/linz/topo-imagery/scripts/standardise_validate.py)

### Template usage
```yaml
- name: standardise-validate
  templateRef:
    name: tpl-ti-standardise-validate
    template: main
  arguments:
    parameters:
      - name: group_id
        value: '{{item}}'
      - name: odr_url
        value: '{{=sprig.trim(workflow.parameters.odr_url)}}'
      - name: collection_id
        value: '{{tasks.stac-setup.outputs.parameters.collection_id}}'
      - name: compression
        value: '{{= workflow.parameters.compression}}'
      - name: current_datetime
        value: '{{tasks.stac-setup.finishedAt}}'
      - name: start_datetime
        value: '{{=sprig.trim(workflow.parameters.start_datetime)}}'
      - name: end_datetime
        value: '{{=sprig.trim(workflow.parameters.end_datetime)}}'
      - name: create_capture_area
        value: '{{=sprig.trim(workflow.parameters.create_capture_area)}}'
      - name: cutline
        value: '{{=sprig.trim(workflow.parameters.cutline)}}'
      - name: gsd
        value: '{{=sprig.trim(workflow.parameters.gsd)}}'
      - name: target
        value: '{{=sprig.trimSuffix("/", tasks["get-location"].outputs.parameters.location)}}/flat/'
      - name: source_epsg
        value: '{{=sprig.trim(workflow.parameters.source_epsg)}}'
      - name: target_epsg
        value: '{{=sprig.trim(workflow.parameters.target_epsg)}}'
    artifacts:
      - name: group_data
        from: '{{ tasks.group.outputs.artifacts.output }}'
```

The Workflow caller must have the following volume:

```yaml
volumes:
  - name: ephemeral
    emptyDir: {}
```
