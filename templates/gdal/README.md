# GDAL Templates
## Contents:

- [GDAL Merge](#gdalmerge)

# gdalmerge - `tpl-gdalmerge`

This workflow merges two input raster files into one.
On a per-band basis, `gdal_merge.py` will keep the last valid (not "no data") value, going from left to right in the list of filenames.

In this workflow, use `base_filename` as base layer and `additional_filename` as top layer.

If more than two files need to be merged into one, consider supplying a VRT file in `additional_filename`.

**Note:** Paths to files need to be supplied as `/vsis3/` or `/vsis3_streaming/` paths instead of `s3://` links.

Upon completion the merged TIFF file will be available to follow-on workflow steps as an articfact named `merged_tiff`.

## Workflow Input Parameters

| Parameter            | Type | Default           | Description                                                                                                                                        |
| -------------------- | ---- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| version_topo_imagery | str  | v7                | (Optional) Version of topo-imagery to use, e.g. 'latest' or 'v7.0.1'                                                                               |
| ticket               | str  |                   | (Optional) Ticket ID e.g. 'TDE-1130'                                                                                                               |
| merged_filename      | str  | merge_output.tiff | (Optional) Output file name for the artifact                                                                                                       |
| base_filename        | str  |                   | File to use as base layer (use /vsis3/ paths instead of s3://), e.g. "/vsis3_streaming/bucket/8m/CB13.tiff"                                        |
| additional_filename  | str  |                   | File to use as top layer (use /vsis3/ paths instead of s3://), e.g. "/vsis3_streaming/bucket/1m/CB13.tiff". Use VRT files to layer multiple files. |
