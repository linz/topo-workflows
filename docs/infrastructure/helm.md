# Working with Helm & CDK8s

It is possible to generate a specific Helm construct for the component if their chart includes a `value.schema.json`. This is useful to provide typing hints when specifying their configuration (<https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema>)

To generate the Helm Construct for a specific Chart, follow the instructions [here](https://github.com/cdk8s-team/cdk8s/blob/master/docs/cli/import.md#values-schema):

Specify the output for the imports:

`--output infra/imports/`

However, some of the component Helm charts do not have a `values.schema.json`. And that the case for most of our components:

- [aws-for-fluent-bit](./components/fluentbit.md) (<https://github.com/aws/eks-charts/issues/1011>)
- [Karpenter](./components/karpenter.md)
- [Argo workflows](./components/argo.workflows.md)