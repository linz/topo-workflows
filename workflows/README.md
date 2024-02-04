## Workflow creation

### Using `sprig` functions

While using [sprig functions](http://masterminds.github.io/sprig/) a task or workflow parameter should not contain `-`, all spaces should be subsituted with `_` to be correctly parsed:
`workflow.parameters.my-param` -> `workflow.parameters.my_param`
