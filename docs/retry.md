# Default retryStrategy

The default [`retryStrategy`](https://argo-workflows.readthedocs.io/en/stable/fields/#retrystrategy) is defined at the `workflowDefaults` level in the [Argo Workflow chart configuration](https://github.com/linz/topo-workflows/blob/master/infra/charts/argo.workflows.ts). This will be apply to every step/tasks by default.

## Overriding

To override the default `retryStrategy`, it can be done at the workflow or template level by defining a specific `retryStrategy`.

## Avoiding retry

For example, to avoid the default `retryStrategy` and make sure the task does not retry:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: my-wf-
spec:
  entrypoint: main
  templates:
    - name: main
      retryStrategy:
        expression: 'false'
      container:
        image: python:alpine3.6
        command: ['python']
        source: |
          # Do something that fails ...
```
