# Elastic Agent

The agent runs as a DaemonSet and collects:
- Kubernetes logs
- Container metrics
- Node metrics
- System metrics

Each node runs one Elastic Agent pod.


```mermaid
flowchart LR
    subgraph EKS Cluster
        A[Elastic Agent DaemonSet on each node]
    end

    A --> B[Elastic Fleet]
    B --> C[Elasticsearch]
    C --> D[Kibana\nSearch / Dashboards]
```

## Investigating the metrics

Index: `metrics-*`

- Filter on the cluster: `"aws.tags.eks:cluster-name": "Workflows"`
- `kubernetes.container.*` fields give information about the container metrics, e.g `kubernetes.container.memory.usage.bytes`.
