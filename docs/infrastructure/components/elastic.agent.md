# Elastic Agent

The agent runs as a DaemonSet and collects:

- Kubernetes logs (not collected in this setup)
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
    C --> D[Kibana<br>Search / Dashboards]
```

## Fleet

### Installation

[The official documentation](https://www.elastic.co/docs/reference/fleet/example-kubernetes-fleet-managed-agent-helm#agent-fleet-managed-helm-example-install-agent) has been followed to create the Fleet policy.

### Configuration

From the standard configuration, the following changes have been made:

- Collect Kubernetes container logs has been de-activated. We already collect these logs using Fluent Bit and we want to avoid duplication.
- Collect Kubernetes events from Kubernetes API Server has been de-activated. We already collect these events using Event exporter and we want to avoid duplication.

## Investigating the metrics

Index: `metrics-*`

- Filter on the cluster: `"aws.tags.eks:cluster-name": "Workflows"`
- `kubernetes.container.*` fields give information about the container metrics, e.g `kubernetes.container.memory.usage.bytes`.
