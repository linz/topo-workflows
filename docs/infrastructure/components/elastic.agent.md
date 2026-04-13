# Elastic Agent

## Table of contents

- [Overview](#overview)
- [Fleet](#fleet)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [When to update](#when-to-update)
- [Investigating the metrics](#investigating-the-metrics)

## Overview

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

## When to update

- Update Elastic Agent whenever the Elastic Stack (e.g. Elastic Cloud) is upgraded to keep versions aligned.
- Perform updates via Helm (code change), not directly in Elastic Fleet, to avoid configuration drift.
- Also update for critical fixes or security advisories from Elastic.

## Investigating the metrics

Index: `metrics-*`

- Filter on the cluster: `"aws.tags.eks:cluster-name": "Workflows"`
- `kubernetes.container.*` fields give information about the container metrics, e.g `kubernetes.container.memory.usage.bytes`.
