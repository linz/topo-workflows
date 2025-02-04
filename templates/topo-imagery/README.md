# Topo-Imagery templates

## topo-imagery/generate-hillshade - `tpl-create-hillshade`

Template for creating hillshades from TIFFs (DEM).  
See [generate_hillshade.py](https://github.com/linz/topo-imagery/pull/1253)
This `WorkflowTemplate` is also calling other templates in order to create the inputs of the `linz/topo-imagery/generate_hillshade.py` script:

1. `tile-index-validate` to create a list of tiles with their source TIFF files
2. `group` to split the list created into grouped tiles for parallel processing

It allows generating multiple types of hillshade from the same source TIFF files, as the `preset` parameter expects a list of hillshade presets.

### Template usage

```yaml
- name: create-hillshade
  templateRef:
    name: tpl-create-hillshade
    template: main
  arguments:
    parameters:
      - name: source
        value: 's3://nz-elevation/new-zealand/new-zealand-contour/dem_8m/2193/'
      - name: scale
        value: '50000'
      - name: group
        value: '2'
      - name: version_argo_tasks
        value: 'v4'
      - name: version_topo_imagery
        value: 'v7'
      - name: target
        value: '{{=sprig.trimSuffix("/", tasks["get-location"].outputs.parameters.location)}}/flat/'
      - name: preset
        value: '["greyscale", "igor"]'
```

The Workflow caller must have the following volume:

```yaml
volumes:
  - name: ephemeral
    emptyDir: {}
```

### Output

The hillshade TIFF files will be saved in a subdirectory for each of the `preset` within the `target` directory.
Example: `s3://linz-workflows-scratch/2025-02/03-test-hillshade-94clh/flat/igor/`
