# Contents

- [cron-stac-validate-fast](#cron-stac-validate-fast)
- [cron-stac-validate-full](#cron-stac-validate-full)
- [National Elevation](#national-elevation)
- [National Hillshades](#national-hillshades)

## STAC validation

The goal of the following [Cron Workflows](https://argo-workflows.readthedocs.io/en/stable/cron-workflows/) is to check the validity of the STAC metadata published in the AWS Open Data Registries [NZ Elevation](https://registry.opendata.aws/nz-elevation/) and [NZ Imagery](https://registry.opendata.aws/nz-imagery/).

> **_NOTE:_** To simplify the overall workflow deployment process, these `CronWorkflow`s have one main task per registry. It looks like a duplication that could be avoided but as we are not using [`argo` CLI](https://argo-workflows.readthedocs.io/en/stable/walk-through/argo-cli/) to deploy the workflows - which allows parameter passing - we could not deploy one `CronWorkflow` per `uri` (or registry).

### cron-stac-validate-fast

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/argo-tasks/blob/master/README.md#stac-validate) using the [`tpl-at-stac-validate`](https://github.com/linz/topo-workflows/blob/master/templates/argo-tasks/README.md#argo-tasksstac-validate).

It does verify that the [STAC links](https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#link-object) are valid.

- schedule: **every day at 5am**

### cron-stac-validate-full

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/argo-tasks/blob/master/README.md#stac-validate) using the [`stac-validate-parallel`](https://github.com/linz/topo-workflows/blob/master/workflows/stac/README.md#stac-validate-parallel).

It also validate that the [STAC assets](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md#assets) are valid. Verifying all asset (TIFF files) checksums is expensive, so this workflow is run less often than [cron-stac-validate-fast](#cron-stac-validate-fast).

> **_NOTE:_** Due to the parallelism design, this workflow does not validate the root parent `catalog.json` in order to validate each `collection.json` separately. This is not an issue as the `catalog.json` does not contain any `asset` and is already validated by the [cron-stac-validata-fast](#cron-stac-validate-fast) job.

- schedule: **every 1st of the month at 5am**

## National Elevation

The two cron workflows `cron-national-dem` and `cron-national-dsm` trigger the `national-elevation` workflow on a daily (Mon-Fri) basis to make sure that any update to those 1m DEM and 1m DSM datasets (`s3://nz-elevation`) that are listed in the configuration ([DEM](https://github.com/linz/basemaps-config/blob/master/config/tileset/elevation.json) / [DSM](https://github.com/linz/basemaps-config/blob/master/config/tileset/elevation.dsm.json)), or any update to the configuration itself, are propagated to the respective dataset:

- [New Zealand LiDAR 1m DEM](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dem_1m/2193/collection.json)
- [New Zealand LiDAR 1m DSM](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dsm_1m/2193/collection.json)
-
- schedule: **Monday to Friday at 6am**

## National Hillshades

The two cron workflows `cron-national-dem-hillshades` and `cron-national-dsm-hillshades` trigger the `hillshade-combinations` workflow on a daily (Mon-Fri) basis to make sure that any update to the national 1m DEM/DSM datasets will be reflected in the respective 1m hillshade datasets:

- [New Zealand LiDAR 1m DEM Hillshade](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dem-hillshade_1m/2193/collection.json)
- [New Zealand LiDAR 1m DEM Hillshade - Igor](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dem-hillshade-igor_1m/2193/collection.json)
- [New Zealand LiDAR 1m DSM Hillshade](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dsm-hillshade_1m/2193/collection.json)
- [New Zealand LiDAR 1m DSM Hillshade - Igor](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dsm-hillshade-igor_1m/2193/collection.json)

- schedule: **Monday to Friday at 12:30pm**

## National Merged Hillshades

The two cron workflows `cron-national-merged-[dem/dsm]-hillshades` run on a daily (Mon-Fri) basis to update the below listed merged hillshade datasets after the respective 1m hillshade datasets have been updated:

- [New Zealand DEM Hillshade](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dem-hillshade/2193/collection.json)
- [New Zealand 1m DEM Hillshade - Igor](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dem-hillshade-igor/2193/collection.json)
- [New Zealand DSM Hillshade](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dsm-hillshade/2193/collection.json)
- [New Zealand DSM Hillshade - Igor](https://github.com/linz/elevation/blob/master/stac/new-zealand/new-zealand/dsm-hillshade-igor/2193/collection.json)

- schedule: **Monday to Friday at 3:00pm**
