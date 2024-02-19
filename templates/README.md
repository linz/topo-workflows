# Templates

Templates are small reusable components that can be shared across workflow templates

To use a template, use the `templateRef` inside your workflow and provide `arguments` to the template.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: test-tiv-component-
spec:
  entrypoint: main
  templates:
    - name: main
      dag:
        tasks:
          - name: tile-index-validate
            templateRef:
              name: tpl-at-tile-index-validate
              template: main

            arguments:
              parameters:
                - name: scale
                  value: 5000

                - name: source
                  value: s3://linz-topographic-upload/SKYVUW/SN9457/

                - name: source_epsg
                  value: 2193
```
