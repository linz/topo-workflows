# Topo-Imagery templates

## Contents:

- [Standardise Validate](##topo-imagery/standardise-validate)
- [Create Collection](##topo-imagery/create-collection)
- [Generate Hillshade](##topo-imagery/generate-hillshade)

## topo-imagery/standardise-validate - `tpl-ti-standardise-validate`

Template for TIFF standardisation and non-visual QA.

See [standardise_validate.py](https://github.com/linz/topo-imagery/blob/master/scripts/standardise_validate.py)

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
      - name: collection_id
        value: '{{tasks.stac-setup.outputs.parameters.collection_id}}'
      - name: current_datetime
        value: '{{tasks.stac-setup.finishedAt}}'
      - name: target
        value: '{{=sprig.trimSuffix("/", tasks["get-location"].outputs.parameters.location)}}/flat/'
      - name: compression
        value: '{{= workflow.parameters.compression}}'
      - name: odr_url
        value: '{{=sprig.trim(workflow.parameters.odr_url)}}'
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
      - name: scale_to_resolution
        value: '{{=sprig.trim(workflow.parameters.scale_to_resolution)}}'
      - name: source_epsg
        value: '{{=sprig.trim(workflow.parameters.source_epsg)}}'
      - name: target_epsg
        value: '{{=sprig.trim(workflow.parameters.target_epsg)}}'
      - name: version_topo_imagery
        value: '{{= workflow.parameters.version_topo_imagery}}'
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

## topo-imagery/create-collection - `tpl-ti-create-collection`

Template for creating a STAC collection from existing STAC items and asset TIFFs.
If TIFF footprint files exist, a `capture-area.geojson` output artifact will be created.

See [collection_from_items.py](https://github.com/linz/topo-imagery/blob/master/scripts/collection_from_items.py)

### Template usage

```yaml
- name: create-collection
  templateRef:
    name: tpl-ti-create-collection
    template: main
  arguments:
    parameters:
      - name: collection_id
        value: '{{tasks.stac-setup.outputs.parameters.collection_id}}'
      - name: linz_slug
        value: '{{tasks.stac-setup.outputs.parameters.linz_slug}}'
      - name: location
        value: '{{tasks.get-location.outputs.parameters.location}}'
      - name: current_datetime
        value: '{{tasks.stac-setup.finishedAt}}'
      - name: odr_url
        value: '{{=sprig.trim(workflow.parameters.odr_url)}}'
      - name: category
        value: '{{=sprig.trim(workflow.parameters.category)}}'
      - name: region
        value: '{{=sprig.trim(workflow.parameters.region)}}'
      - name: gsd
        value: '{{=sprig.trim(workflow.parameters.gsd)}}'
      - name: geographic_description
        value: '{{=sprig.trim(workflow.parameters.geographic_description)}}'
      - name: event
        value: '{{=sprig.trim(workflow.parameters.event)}}'
      - name: historic_survey_number
        value: '{{=sprig.trim(workflow.parameters.historic_survey_number)}}'
      - name: lifecycle
        value: '{{=sprig.trim(workflow.parameters.lifecycle)}}'
      - name: add_title_suffix
        value: 'true'
      - name: producer
        value: '{{workflow.parameters.producer}}'
      - name: producer_list
        value: '{{=sprig.trim(workflow.parameters.producer_list)}}'
      - name: licensor
        value: '{{workflow.parameters.licensor}}'
      - name: licensor_list
        value: '{{=sprig.trim(workflow.parameters.licensor_list)}}'
      - name: create_capture_dates
        value: 'false'
      - name: keep_title
        value: 'true'
      - name: version_topo_imagery
        value: '{{= workflow.parameters.version_argo_tasks}}'
```

## topo-imagery/generate-hillshade - `tpl-create-hillshade`

Template for creating hillshades from elevation TIFFs (DEM / DSM).
See [generate_hillshade.py](https://github.com/linz/topo-imagery/pull/1253)

### Template usage

```yaml
- name: generate-hillshade
  templateRef:
    name: tpl-ti-generate-hillshade
    template: main
  arguments:
    parameters:
      - name: group_id
        value: '{{item}}'
      - name: hillshade_preset
        value: '{{=sprig.trim(workflow.parameters.hillshade_preset)}}'
      - name: version_topo_imagery
        value: '{{= workflow.parameters.version_topo_imagery}}'
      - name: target # not using flat/ here, but {{workflow.parameters.hillshade_preset}}/ to keep temporary HS output separate
        value: '{{=sprig.trimSuffix("/", tasks["get-location"].outputs.parameters.location)}}/{{workflow.parameters.hillshade_preset}}/flat/'
      - name: collection_id
        value: '{{tasks.stac-setup-hillshade.outputs.parameters.collection_id}}'
      - name: gsd
        value: '{{=sprig.trim(workflow.parameters.gsd)}}'
      - name: current_datetime
        value: '{{tasks.stac-setup-hillshade.finishedAt}}'
      - name: odr_url
        value: '{{=sprig.trim(workflow.parameters.odr_url)}}'
    artifacts:
      - name: group_data
        from: '{{tasks.group.outputs.artifacts.output}}'
  withParam: '{{tasks.group.outputs.parameters.output}}'
```

The Workflow caller must have the following volume:

```yaml
volumes:
  - name: ephemeral
    emptyDir: {}
```
