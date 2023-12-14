# Fluent Bit

## Presentation

[Fluent Bit](https://docs.fluentbit.io/manual/installation/kubernetes) is deployed as a [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) and collects logs from every pod of the cluster.

![Fluent Bit in EKS](static/fluentbit_in_eks.png)

## Installation

### aws-for-fluent-bit

As we run our K8s cluster on AWS EKS, we chose to use [`aws-for-fluent-bit`](https://github.com/aws/aws-for-fluent-bit). It does provide some AWS specific plugins such as CloudWatch Logs which is helpful for us as we want our logs to be directed into CloudWatch in order to feed our log pipeline.

### Helm Chart

Fluent Bit is installed using the `aws-for-fluent-bit` [Helm Chart](https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit) via CDK8s, defined and configured in `infra/charts/fluentbit.ts`. The [chart `values.yaml`](https://github.com/aws/eks-charts/blob/master/stable/aws-for-fluent-bit/values.yaml) gives an overview of what is possible to configure.

## Configuration

### CloudWatch logs

`cloudWatchLogs` (which is the new CloudWatch plugin [providing better performance](https://github.com/aws/eks-charts/pull/903) than `cloudWatch`) needs to be enabled.
When making any change to the `logGroupName`, be aware that this path is used by the `aws-log-config` to redirect the logs to Elasticsearch.

### Elasticsearch

Elasticsearch forwarder should not be enabled. Our logs are shipped into Elasticsearch using the [elasticsearch-shipper](https://github.com/linz/elasticsearch-shipper)

### Fluent Bit logs

Fluent Bit application logs are sent by default to CloudWatch.

## Upgrade

To upgrade the Fluent Bit version, as per the installation, you need to do it via upgrading `aws-for-fluent-bit`.

### Version

After choosing a new version to upgrade to (you want a bug fix or a new feature), modify the chart using CDK8s (`infra/charts/fluentbit.ts`).
The Fluent Bit application version is stored in `appVersion` but this is only here for reference. The version to upgrade is the version of the corresponding Helm Chart delivered by `aws-for-fluent-bit` which is defined in `chartVersion`.

## Troubleshooting

1. Verify Fluent Bit is deployed and available in the K8s cluster

   ```shell
   kubectl get daemonset -n fluentbit
   NAME        DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
   fluentbit   2         2         2       2            2           <none>          28d
   ```

2. Verify the Fluent Bit pods logs

   - Get pod names

     ```shell
     kubectl get pods -n fluentbit
     NAME              READY   STATUS    RESTARTS   AGE
     fluentbit-brx5n   1/1     Running   0          27d
     fluentbit-btb9b   1/1     Running   0          27d
     ```

   - Check pod logs for any errors

     ```shell
     kubectl logs fluentbit-brx5n -n fluentbit
     ```

3. Check configuration (`ConfigMap`) in the cluster

   ```shell
   kubectl describe configmap fluentbit -n fluentbit
   ```

   - Check configuration that might have been deployed by running `cdk8s synth` and look at the `fluentbit` yaml file.
