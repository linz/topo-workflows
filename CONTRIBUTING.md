# Contributing

## Workflows

### Optional arguments

To deal with optional arguments in a template, prioritize conditionally passing the argument rather than passing it with no value.

#### Good

```yaml
args:
  - "{{= sprig.empty(inputs.parameters.start_datetime) ? '' : '--start-year=' + sprig.trunc(4, inputs.parameters.start_datetime) }}"
```

Will result to not passing `--start-year` at all if `inputs.parameters.start_datetime` is empty

#### Bad

```yaml
args:
  - '--start-year={{=sprig.trunc(4, inputs.parameters.start_datetime)}}
```

Will result to pass `--start-year=` (empty value). **This can cause an issue with some CLI tools.**
