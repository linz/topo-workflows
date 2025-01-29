# GDAL Templates

## Contents:

- [GDAL Merge](#gdalmerge)

# gdalmerge - `tpl-gdalmerge`

This workflow merges two input raster files into one.
On a per-band basis, `gdal_merge.py` will keep the last valid (not "no data") value, going from left to right in the list of filenames.

In this workflow, use `base_filename` as base layer and `additional_filename` as top layer.

If more than two files need to be merged into one, consider supplying a VRT file in `additional_filename`.

**Note:** Paths to files can be supplied as `s3://`, `/vsis3/` or `/vsis3_streaming/` paths. If supplied as `s3://` URI, then `s3://` will be replaced by `/vsis3_streaming/`.

Upon completion the merged TIFF file will be available to follow-on workflow steps as an artifact named `merged_tiff`.

## Workflow Input Parameters

| Parameter            | Type | Default                                      | Description                                                                                          |
| -------------------- | ---- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| version_topo_imagery | str  | v7                                           | (Optional) Version of topo-imagery to use, e.g. 'latest' or 'v7.0.1'                                 |
| merged_filename      | str  | basename(base_filename)<br/>e.g. `CB13.tiff` | (Optional) Output file name for the artifact.                                                        |
| base_filename        | str  |                                              | File to use as base layer, e.g. `s3://bucket/8m/CB13.tiff`                                           |
| additional_filename  | str  |                                              | File to use as top layer, e.g. `s3://bucket/1m/CB13.tiff`<br/>Use VRT files to layer multiple files. |

## Example Usage

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-gdalmerge-
spec:
  entrypoint: merge
  templates:
    - name: merge
      dag:
        tasks:
          - name: gdalmerge-simple
            templateRef:
              name: tpl-gdalmerge
              template: main
            arguments:
              parameters:
                - name: base_filename
                  value: 's3://nz-elevation/new-zealand/new-zealand-contour/dem-hillshade-igor_8m/2193/CB12.tiff'
                - name: additional_filename
                  value: 's3://nz-elevation/new-zealand/new-zealand/dem-hillshade-igor/2193/CB12.tiff'
          - name: gdalmerge-extended
            templateRef:
              name: tpl-gdalmerge
              template: main
            arguments:
              parameters:
                - name: version_topo_imagery
                  value: 'latest'
                - name: base_filename
                  value: 's3://nz-elevation/new-zealand/new-zealand-contour/dem-hillshade-igor_8m/2193/CB13.tiff'
                - name: additional_filename
                  value: '/vsis3/nz-elevation/new-zealand/new-zealand/dem-hillshade-igor/2193/CB13.tiff' # also works
                - name: merged_filename
                  value: 'CB13-merged.tiff'
```
