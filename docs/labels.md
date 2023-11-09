# Kubernetes & Workflow Labels

To make it easier to filter and parse the huge amount of workflows and other objects that are inside our cluster. A number of labels need to be applied to every workflow.

The labels can be used in both [Argo Workflows](./infrastructure/components/argo.workflows.md) and the kubectl command line.

The following list of labels should be used in conjunction with kubernetes [well known labels](https://kubernetes.io/docs/reference/labels-annotations-taints/) and [recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)

## Workflows

| Label                 | Description                              | Examples                              |
| --------------------- | ---------------------------------------- | ------------------------------------- |
| `linz.govt.nz/ticket` | JIRA Ticket number                       | `TDE-912`, `BM-37`                    |
| `linz.govt.nz/region` | Geographic region that object relates to | "wellington", "auckland"              |
| `linz.govt.nz/category`  | The LINZ group that owns the workflow    | "basemaps", "imagery", "test", "util" |

For the type of data that is being processed

| Label                        | Description                   | Examples               |
| ---------------------------- | ----------------------------- | ---------------------- |
| `linz.govt.nz/data-type`     | Type of data being processed  | "raster", "vector"     |
| `linz.govt.nz/data-sub-type` | Sub type of data if it exists | "imagery", "elevation" |

## Kubernetes Objects

Most other objects deployed via AWS-CDK and CDK8s should also include information about the CICD process that deployed it

| Label                      | Description                              | Examples                                   |
| -------------------------- | ---------------------------------------- | ------------------------------------------ |
| `linz.govt.nz/git-hash`    | git hash that deployed the object        | "bb3dab2779922094d2b8ecd4c67f30c66b38613d" |
| `linz.govt.nz/git-version` | git version information                  | "v6.46.0", "v0.0.1-20-gbb3dab27"           |
| `linz.govt.nz/git-repo`    | git repository that the object came from | "linz\_\_topo-workflows"                   |
| `linz.govt.nz/build-id`    | Unique ID of the build that deployed     | "6806791032-1"                             |

## Label Usage

To list all the pods and show their labels

```bash
k get pods -n argo --show-labels
```

Find pods based off component names

```bash
k get pods -n argo -l "app.kubernetes.io/component=server"
```

Find all resources deployed from linz/topo-workflows github repository, Kubernetes does not work with "/" so repository names are replaced with "\_\_"

```bash
k get all -A -l "linz.govt.nz/git-repo=linz__topo-workflows"
```
