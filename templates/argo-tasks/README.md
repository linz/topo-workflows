# ArgoTasks Templates

## argo-tasks/group - `tpl-at-group`

Group inputs into outputs to be used with `withParam` to run one task per grouping

### Template usage

Group the output of `tile-index-validate` into groups of size 5

```yaml
- name: group
  templateRef:
    name: tpl-at-group
    template: main

  arguments:
    artifacts:
    - name: input
        from: "{{ tasks.tile-index-validate.outputs.artifacts.files }}"

    parameters:
    - name: size
        value: 5

  depends: "tile-index-validate"
```

### Consumer usage

Using `withParams` to spin up a number of tasks from

```yaml
# ...

steps:
  # consume the output of a grouper
  - - name: consume
      template: consume
      arguments:
        parameters:
          - name: group_id
            value: "{{item}}" # groupId eg "000", "001", "002" etc..

        # All the grouped data as a folder
        artifacts:
          - name: group_data
            from: "{{ steps.group.outputs.artifacts.output }}"

      withParam: "{{ steps.group.outputs.parameters.output }}"

# ...

- name: consume
  inputs:
    # Id of the grouping file to consume
    # to be used with `group_data`
    parameters:
    - name: group_id # "000", "001" ... etc

    # grouped input data for the consumer, this will be a folder full of JSON files
    # one file per groupId
    artifacts:
    - name: group_data
      path: /tmp/input/

    parameters:
    - name: group_id # "000", "001" ... etc

  script:
    image: "019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/eks:argo-tasks-latest"
    command: [bash]
    source: |
      echo {{ inputs.parameters.group_id}}
      ls -alh /tmp/input/

      # for example using with a --from-file
      # ./test-cli --from-file=/tmp/group/input/{{inputs.parameters.group_id}}.json
```
