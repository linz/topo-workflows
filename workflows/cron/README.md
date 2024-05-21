# Contents:

- [cron-stac-validata](#cron-stac-validate)
- [cron-stac-validate-all-data](#cron-stac-validate-all-data)

# STAC validation

## cron-stac-validate

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/topo-workflows/blob/master/templates/argo-tasks/README.md#argo-tasksstac-validate) using the [`tpl-at-stac-validate`](https://github.com/linz/topo-workflows/blob/master/templates/argo-tasks/README.md#argo-tasksstac-validate). It does verify that the [STAC links](https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#link-object) are valid.

- schedule: **every day at 5am**

## cron-stac-validate-all-data

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/topo-workflows/blob/master/templates/argo-tasks/README.md#argo-tasksstac-validate) using the [`stac-validate-parallel`](https://github.com/linz/topo-workflows/blob/master/workflows/stac/README.md#stac-validate-parallel)
It also validate that the [STAC assets](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md#assets) are valid. Verifying all asset (TIFF files) checksums is expensive, so this workflow is ran less often than the [cron STAC validate](#cron-stac-validate).

> **_NOTE:_** Due to the parallelism design, this workflow does not validate the root parent `catalog.json` in order to validate each `collection.json` separately. This is not an issue as the `catalog.json` does not contain any `asset` and is already validated by the [cron-stac-validata](#cron-stac-validate) job.

- schedule: **TBD**
