## Workflow creation

### Using `sprig` functions

While using [sprig function](http://masterminds.github.io/sprig/) on a task or workflow parameter that contains a `-`, the parameter has to be passed with `[]` to be correctly parsed:
`workflow.parameters.my-param` -> `workflow.parameters['my-param']`
