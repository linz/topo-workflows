# Contributing

## Workflows

### Optional arguments

To deal with optional arguments in a template, prioritize conditionally passing the argument rather than passing it with no value.

#### Good

```yaml
args:
  - "{{= sprig.empty(inputs.parameters.start_datetime) ? '' : '--start-year=' + sprig.trunc(4, inputs.parameters.start_datetime) }}"
```

Will result to not passing `--start-year` at all if `inputs.parameters.start_datetime` is empty.

#### Bad

```yaml
args:
  - '--start-year={{=sprig.trunc(4, inputs.parameters.start_datetime)}}
```

Will result to pass `--start-year=` (empty value). **This can cause an issue with some CLI tools.**

### Testing

To deploy the workflow changes in a test namespace inside the production Argo Workflows system, after making a Pull Request (can be draft), add the GitHub label `workflows` to the PR. A GitHub action will be triggered that will deploy the workflows of the current changes to the cluster using a new temporary namespace called `pr-[pullrequest_number]`.

Use the workflows within this temporary namespace to test them.

The namespace will be deleted on merge (or if the label get removed).
