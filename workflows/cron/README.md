# Contents:

- [cron-stac-validata](#cron-stac-validate)
- [cron-stac-validate-all-data](#cron-stac-validate-all-data)

# STAC validation

## cron-stac-validate

Workflow that validates the STAC metadata using [`stac-validate`](https://teams.microsoft.com/v2/?meetingjoin=true#/l/meetup-join/19:meeting_MDc1MWEzNzYtYTI4Yy00OWZmLWJhMzUtYjA1ZmU1ODBmNTg5@thread.v2/0?context=%7b%22Tid%22%3a%222134e961-7e38-4c34-a22b-10da5466b725%22%2c%22Oid%22%3a%2263d2d811-1d35-49f7-b9a3-c60e9b9a9ed1%22%7d&anon=true&deeplinkId=1c8a1674-d597-4c2d-ab7e-6ed968f086b7) and verify that the [STAC links](https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#link-object) are valid (using their checksums).

- schedule: **every day at 5am**

## cron-stac-validate-all-data

It also validate that the data - assets - is valid (using their checksums). Verifying all data checksum is costly, so this workflow is ran less often than the [cron STAC validate](#cron-stac-validate).

> **_NOTE:_** Due to the parallelism design, this workflow does not validate the root parent `catalog.json` in order to validate each `collection.json` separately. This is not an issue as the `catalog.json` does not contain any `asset` and is already validated by the [cron-stac-validata](#cron-stac-validate) job.

- schedule: **To decide**
