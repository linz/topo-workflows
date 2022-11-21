# Topo Workflows - STAC - stac-validate

Validate STAC Collections and Items against [STAC](https://stacspec.org/) schemas and STAC Extension schemas.
Uses the [argo-tasks](https://github.com/linz/argo-tasks#stac-validate) container `stac-validate` command.

## Workflow Input Parameters

| Parameter      | Type | Default                                                      | Description                          |
| -------------- | ---- | ------------------------------------------------------------ | ------------------------------------ |
| stac-file-path | str  | s3://linz-imagery-staging/test/stac-validate/collection.json | The URIs (paths) to the STAC file(s) |

The STAC Validate workflow has one input parameter `stac-file-path`, the full AWS S3 file path(s) to be validated. Separate multiple files with a space. Access permissions are controlled by the [Bucket Sharing Config](https://github.com/linz/topo-aws-infrastructure/blob/master/src/stacks/bucket.sharing.ts) which gives Argo Workflows access to the S3 buckets we use.

The flag `--recursive` is specified inside the STAC Validate WorkflowTemplate, so any linked files will also be validated. If the path is a STAC Collection, e.g. `s3://linz-imagery-staging/test/stac-validate/collection.json` then linked STAC items will also be validated.

## Workflow Outputs

If any schema validation failures are found, the workflow will fail.

Logs can be viewed in Argo by selecting the `stac-validate` workflow component > CONTAINERS > LOGS.

![WorkflowLogs](../../docs/workflow_logs.png)

Example failure messages:

```bash
{"level":30,"time":1668997179522,"pid":16,"hostname":"stac-validate-v1.0.0-41-n6jxb-stac-validate-971572670","id":"01GJBZQRM6D38WZWBDA91EJ8WR","type":"Feature","path":"s3://linz-imagery-staging/test/stac-validate/1259/272916_bad_field_type.json","sch":"https://stac.linz.govt.nz/v0.0.15/linz/schema.json","msg":"Validation:Start"}
{"level":50,"time":1668997179527,"pid":16,"hostname":"stac-validate-v1.0.0-41-n6jxb-stac-validate-971572670","id":"01GJBZQRM6D38WZWBDA91EJ8WR","path":"s3://linz-imagery-staging/test/stac-validate/1259/272916_bad_field_type.json","instancePath":"/properties/mission","schemaPath":"instrument.json/properties/mission/type","keyword":"type","params":{"type":"string"},"message":"must be string","msg":"Validation:Failed"}
{"level":50,"time":1668997179560,"pid":16,"hostname":"stac-validate-v1.0.0-41-n6jxb-stac-validate-971572670","id":"01GJBZQRM6D38WZWBDA91EJ8WR","failures":2,"msg":"StacValidation:Done:Failed"}
```

Example success messages:

```bash
{"level":30,"time":1668995442613,"pid":16,"hostname":"stac-validate-v1.0.0-41-7mwdg-stac-validate-1503824974","id":"01GJBY2JNGWJHSKG71TXD9HCA2","type"
:"Feature","path":"s3://linz-imagery-staging/test/stac-validate/item2.json","sch":"https://stac.linz.govt.nz/v0.0.15/scanning/schema.json","msg":"Vali
dation:Start"}
{"level":30,"time":1668995442614,"pid":16,"hostname":"stac-validate-v1.0.0-41-7mwdg-stac-validate-1503824974","id":"01GJBY2JNGWJHSKG71TXD9HCA2","type"
:"Feature","path":"s3://linz-imagery-staging/test/stac-validate/item2.json","valid":true,"msg":"Validation:Done:Ok"}
{"level":30,"time":1668995442614,"pid":16,"hostname":"stac-validate-v1.0.0-41-7mwdg-stac-validate-1503824974","id":"01GJBY2JNGWJHSKG71TXD9HCA2","msg":
"StacValidation:Done:Ok"}
```
