# Workflow creation

## `retryStrategy` on entrypoint template

A default `retryStrategy` is set as a default template value in the [`argo.workflows.ts`](https://github.com/linz/topo-workflows/blob/master/infra/charts/argo.workflows.ts) chart. That means every template will be retried when a failure happens on a pod using them.

To avoid the entire workflow retrying if a pod did reach the retry limit without any success, the entrypoint template (or `main` by convention) should override this `retryStrategy` to disable the retry, using [`expression: 'false'`](https://argo-workflows.readthedocs.io/en/latest/retries/#conditional-retries). This apply to the workflows in `workflows/`, but should not apply to the `workflowTemplate` located in `template/` as they have only one template which is their entrypoint and will be called from a workflow so we want them to retry.

## Using `sprig` functions

While using [sprig functions](http://masterminds.github.io/sprig/) a task or workflow parameter should not contain `-`, all spaces should be subsituted with `_` to be correctly parsed:
`workflow.parameters.my-param` -> `workflow.parameters.my_param`
