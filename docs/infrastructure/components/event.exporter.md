# event-exporter

## Presentation

[kubernetes-event-exporter](https://github.com/resmoio/kubernetes-event-exporter) is a tool that enables exporting [Kubernetes events](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/#Event) to various services.

One usage of exporting the Kubernetes events for our cluster is to get [Argo Workflows specific events](https://argo-workflows.readthedocs.io/en/stable/workflow-events/) sent to Elasticsearch so we can raise user alerts based on them.

## Configuration

The current configuration dumps the events as `standard output`. It is sufficient to get the event logs coming in Elastic Search.

```yaml
logLevel: error
logFormat: json
route:
  routes:
    - match:
        - receiver: 'dump'
receivers:
  - name: 'dump'
    stdout: {}
```

## Troubleshooting

### Logs

#### From the pod

1. Get the pod name

   ```bash
   > kubectl get pods -n event-exporter
   NAME                             READY   STATUS    RESTARTS   AGE
   event-exporter-b768fb758-zbghq   1/1     Running   0          207d
   ```

2. View the logs

   ```bash
   > kubectl logs event-exporter-b768fb758-zbghq -n event-exporter
   ```

#### From CloudWatch

Log group name: `/aws/eks/Workflows/workload/event-exporter`

#### From Elasticsearch

Filter: `kubernetes.labels.app.kubernetes.io/name.keyword: "event-exporter"`
