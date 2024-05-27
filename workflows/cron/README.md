# Contents:

- [cron-stac-validate](#cron-stac-validate)
- [cron-stac-validate-checksums](#cron-stac-validate-checksums)

# STAC validation

The goal of the following [Cron Workflows](https://argo-workflows.readthedocs.io/en/stable/cron-workflows/) is to check the validity of the STAC metadata published in the AWS Open Data Registries [NZ Elevation](https://registry.opendata.aws/nz-elevation/) and [NZ Imagery](https://registry.opendata.aws/nz-imagery/).

> **_NOTE:_** To simplify the overall workflow deployment process, these `CronWorkflow`s have one main task per registry. It looks like a duplication that could be avoided but as we are not using [`argo` CLI](https://argo-workflows.readthedocs.io/en/stable/walk-through/argo-cli/) to deploy the workflows - which allows parameter passing - we could not deploy one `CronWorkflow` per `uri` (or registry).

## cron-stac-validate

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/argo-tasks/blob/master/README.md#stac-validate) using the [`tpl-at-stac-validate`](https://github.com/linz/topo-workflows/blob/master/templates/argo-tasks/README.md#argo-tasksstac-validate).

It does verify that the [STAC links](https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#link-object) are valid.

- schedule: **every day at 5am**

## cron-stac-validate-checksums

Workflow that validates the STAC metadata by calling the [`stac-validate` argo-tasks command](https://github.com/linz/argo-tasks/blob/master/README.md#stac-validate) using the [`stac-validate-parallel`](https://github.com/linz/topo-workflows/blob/master/workflows/stac/README.md#stac-validate-parallel).

It also validate that the [STAC assets](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md#assets) are valid. Verifying all asset (TIFF files) checksums is expensive, so this workflow is run less often than [cron STAC validate](#cron-stac-validate).

> **_NOTE:_** Due to the parallelism design, this workflow does not validate the root parent `catalog.json` in order to validate each `collection.json` separately. This is not an issue as the `catalog.json` does not contain any `asset` and is already validated by the [cron-stac-validata](#cron-stac-validate) job.

- schedule: **every 1st of the month**
