# Contents:

- [Imagery-Import](#Imagery-Import)
- [Mapsheet-Json](#Mapsheet-Json)
- [Create-Config](#Create-Config)
- [Create-Overview](#Create-Overview)
- [Create-Overview-All](#Create-Overview-All)

# Mapsheet-Json

## Workflow Description

This workflow is used for find out which COGs intersect with a 1:50k tile in order to build ECWs for Topo50 map sheet.

## Workflow Description

```mermaid
graph TD;
    fetch-layer-->transform->create-mapsheet;
```

### [fetch-layer](https://github.com/linz/argo-tasks/blob/master/src/commands/lds-cache/lds.cache.ts)

Fetch and download layer as geopackage from [lds-cache](https://github.com/linz/lds-cache).

### transform

Transform geopackage to flatgeobuf using the following gdal command.

Docker: gdal:alpine-small-3.5.0

```
ogr2ogr -f FlatGeobuf /tmp/flatGeobuf.fgb /tmp/geopackage.gpkg

```

### [create-mapsheet](https://github.com/linz/basemaps/blob/master/packages/cli/src/cli/config/action.cog.mapsheet.ts)

This command loop trough the existing layers and find intersection between Tile Index and layers, then output the mapsheet.json.

## Workflow Input Parameters

| Parameter | Type | Default      | Description                                                                                                   |
| --------- | ---- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| layer     | int  | 104687       | LINZ Data Service Layer Id for [1:50K Tile Index](https://data.linz.govt.nz/layer/104687-nz-150k-tile-index/) |
| includes  | str  | null         | Regex pattern to include the Basemaps layers by layer name, default null to include everything.               |
| excludes  | str  | nz_satellite | Regex pattern to exclude the Basemaps layers by layer name, default to exclude nz_satellite layer.            |

## Workflow Outputs Example

mapsheet.json

```
[
{
"sheetCode": "BY26",
"files": [
"s3://linz-basemaps/2193/nz_satellite_2021-2022_10m_RGB/01G73E4AMSQ91TXQ3KC90NNPA0/4-7-8.tiff"
]
},
{
"sheetCode": "BX26",
"files": [
"s3://linz-basemaps/2193/nz_satellite_2021-2022_10m_RGB/01G73E4AMSQ91TXQ3KC90NNPA0/4-7-8.tiff"
]
},
...
]
```

# Create-config

This workflow using to create a configuration for a path of TIFF files and provide a preview link with Basemaps system.

It is mainly using for the Standardising workflow to provide visual QA for the standarised imagery.

[Source-Code](https://github.com/linz/basemaps/blob/59a3e7fa847f64f5c83fc876b071db947407d14d/packages/cli/src/cli/config/action.imagery.config.ts)

## Workflow Input Parameters

| Parameter | Type | Default                                    | Description                       |
| --------- | ---- | ------------------------------------------ | --------------------------------- |
| location  | str  | s3://linz-workflow-artifacts/path_of_tiffs | the uri (path) to the input tiffs |

### Example Input Parameters

| Parameter | Value                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| source    | s3://linz-workflow-artifacts/2022-11/30-imagery-standardising-v0.2.0-60-v9rwq/ |

## Workflow Outputs

The S3 path to the processed TIFFs and the Basemaps visualisation URL can be found in the create-config pod outputs.
for example:

**location:**: `s3://linz-workflow-artifacts/2022-11/30-imagery-standardising-v0.2.0-60-v9rwq/`

**uri:** `https://basemaps.linz.govt.nz?config=...`

# Create-Overview

## Workflow Description

This workflow is using to create webp overviews for tiffs and output overview.tar.co into the output location.

Overviews webps tar file contains tile/z/x/y.webp imagery files which covers lower zoom level of the tiffs file which can be load into Basemaps server and provide a high performance tile requests for low zoom level tiles from high resolution tiffs.

This is mainly using for the Standardising workflow and Imagery-Import workflow which creating overview automatically for the processed tiff files.

[Source-Code](https://github.com/linz/basemaps/tree/master/packages/cli/src/cli/overview)

## Workflow Input Parameters

| Parameter | Type | Default                                        | Description                                                                                                     |
| --------- | ---- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| source    | str  | s3://linz-workflow-artifacts/path_of_tiffs/    | The URIs (paths) to the s3 tiff files.                                                                          |
| output    | str  | s3://linz-workflow-artifacts/path_of_overview/ | The URIs (paths) to store the output overview.tar.co file which normally using same location of the tiff files. |

## Examples

Given a standerised imagery path and output the same path for the overview tar file.

### Publish:

**source:** `s3://linz-workflow-artifacts/2022-11/15-imagery-standardising-v0.2.0-56-x7699/flat/`

**output:** `s3://linz-workflow-artifacts/2022-11/15-imagery-standardising-v0.2.0-56-x7699/flat/`

# Create-Overview-All

## Workflow Description

This workflow is using for one-off job to create overview for all the existing imagery for the [Basemaps aerial map imageries](https://github.com/linz/basemaps-config/blob/master/config/tileset/aerial.json).

## Workflow Input Parameters

None inputs/outputs for this workflow.
