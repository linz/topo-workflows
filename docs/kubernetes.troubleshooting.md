# Kubernetes Troubleshooting (AWS EKS)

This guide covers common troubleshooting steps for the GDE Kubernetes cluster (AWS EKS) running Argo Workflows.

- AWS account: `linz-topo-prod`
- Repository (IaC and workload definitions): <https://github.com/linz/topo-workflows>

## Investigating the cluster

## kubectl

`kubectl` is the primary CLI to inspect Kubernetes resources and quickly identify abnormal cluster state.

### Install

Follow the official Kubernetes installation instructions for `kubectl`:

<https://kubernetes.io/docs/tasks/tools/#kubectl>

### Setup

Authenticate with AWS and configure local kubeconfig:

```bash
aws --region ap-southeast-2 eks update-kubeconfig --name Workflows
```

Quick references:

- <https://kubernetes.io/docs/reference/kubectl/>
- <https://kubernetes.io/docs/reference/kubectl/quick-reference/>

### Verify services

Check that core services exist and are healthy. Missing services can immediately explain platform incidents.

Common expected services:

- `default/kubernetes`
- `argo/argo-workflows-server`
- `karpenter/karpenter`
- `kube-system/kube-dns`
- `kube-system/metrics-server`
- `kubernetes-dashboard/kubernetes-dashboard`

Commands:

```bash
kubectl get services -n <NAMESPACE>
kubectl get services --all-namespaces
```

Example:

```bash
kubectl get services --all-namespaces
```

If `argo-workflows-server` is absent, Argo UI/API operations will fail.

### Check nodes

Nodes are worker machines that run pods.

#### List the nodes

Use node status and age as a quick health signal. In healthy state, nodes should generally be `Ready`.

Command:

```bash
kubectl get nodes
```

Notes:

- Node `AGE` helps identify recent autoscaling or node churn.
- No node roles (`<none>`) can be normal for this cluster.

#### Describe a node

Command:

```bash
kubectl describe node <NODE_NAME>
kubectl get node <NODE_NAME> -o yaml
```

Useful sections in output:

- `Conditions`: `MemoryPressure`, `DiskPressure`, `PIDPressure`, `Ready`
- `Capacity` and `Allocatable`: CPU/memory/pod limits
- `Non-terminated Pods`: what is running on the node
- `Allocated resources`: scheduling pressure and overcommit
- `Events`: node and kubelet lifecycle signals

### List pods

Pod listing helps confirm what is currently running and whether readiness is expected.

Commands:

```bash
kubectl get pods -n argo
kubectl get pods -n argo --field-selector=status.phase=Running
```

Watch for:

- pods stuck in `Pending`
- high `RESTARTS`
- readiness not meeting expected values

### Connect to a pod

When deeper inspection is needed, exec into a container:

```bash
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- sh
```

If the image does not include `sh`, try:

```bash
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- bash
```

### Get logs

Read logs directly from Kubernetes when downstream log pipelines are delayed or incomplete.

Command:

```bash
kubectl logs <POD_NAME> -n <NAMESPACE>
```

Useful variants:

```bash
kubectl logs <POD_NAME> -n <NAMESPACE> --previous
kubectl logs <POD_NAME> -n <NAMESPACE> -f
kubectl logs <POD_NAME> -n <NAMESPACE> -c <CONTAINER_NAME>
```

### Get events

Cluster events are often the fastest way to explain scheduling and startup failures.

Command:

```bash
kubectl get events -A --sort-by=.metadata.creationTimestamp
```

Note: event retention in this cluster is approximately 60 minutes. For older history, use Elastic Search.

## k9s

`k9s` provides a terminal UI for faster navigation across Kubernetes resources during incident response.

### Install

Install instructions:

<https://k9scli.io/topics/install/>

### Start

```bash
k9s
```

Optional: start directly in `argo` namespace.

```bash
k9s -n argo
```

### High-value views

Use command mode in `k9s` (`:`) to jump to views quickly:

- `:ns` namespace switcher
- `:po` pods
- `:dp` deployments
- `:ds` daemonsets (for example `fluentbit`, `elastic-agent`)
- `:no` nodes
- `:ev` events

### Useful actions

- `l` logs
- `d` describe selected resource
- `s` shell into container (when shell exists in image)
- `/` filter current view
- `Ctrl-a` show all namespaces

### Suggested triage flow (k9s)

1. Switch to `argo` namespace (`:ns`).
2. Inspect pods (`:po`) for `Pending`, restart loops, or unhealthy readiness.
3. Open logs (`l`) and describe (`d`) for failing pods.
4. Check warning events (`:ev`) such as scheduling failures and back-offs.
5. Validate nodes (`:no`) are `Ready`.
6. Validate daemonsets (`:ds`) including `fluentbit` and `elastic-agent`.

`k9s` complements `kubectl`; use whichever gives you the fastest signal.

## Kubernetes Dashboard

### Activate the dashboard locally

```bash
kubectl proxy --port=8080 --address=0.0.0.0 --disable-filter=true
```

### Access the dashboard

<http://localhost:8080/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/>

### Get an auth token

```bash
aws eks get-token --cluster-name Workflows --region ap-southeast-2 --role-arn <ROLE_ARN>
```

You can find the role in IAM. Look for `EksWorkflowProd-ClusterEksWorkflowMastersRole`.

### Usage notes

Select the correct namespace from the top-left namespace selector in the dashboard.

Reference: <https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/>

## AWS Web Console

EKS cluster configuration is available in:

`EKS -> Clusters`

Access may be read-only depending on your AWS role.

## Logs

EKS logs (system and workload pods) are processed by Fluent Bit, sent to CloudWatch, then shipped to Elastic Search.

### AWS CloudWatch

Logs are available in the log group:

`/aws/eks/Workflow/container`

### Elastic Search

Main index:

- `li-topo-production-eks` (Topo Data Engineering space)

If parsing fails, check dead-letter queues in Log Archive space.

## Events

Kubernetes events are exported by `kubernetes-event-exporter`.

In Elastic Search, one useful filter is:

`kubernetes.labels.app.kubernetes.io/name.keyword: "event-exporter"`

Known issue: some events may be randomly missing from exporter output (referenced internally as `TDE-479`).

## Components

Most components are deployed through CDK/CDK8s from this repository. In incident response, a tactical delete/apply can sometimes recover broken resources, but use this carefully and with change control.

### Karpenter

Karpenter is the autoscaler responsible for provisioning nodes for unschedulable pods.

Key checks:

- Karpenter controller pod health
- node provisioning events
- provisioner/nodepool constraints

Provisioner configuration reference:

[infra/charts/karpenter.ts](../infra/charts/karpenter.ts)

### Fluent Bit

Fluent Bit collects container logs and forwards them to CloudWatch.

Configuration reference:

[infra/charts/fluentbit.ts](../infra/charts/fluentbit.ts)

### Elastic Agent

Elastic Agent runs as a DaemonSet and is used for metrics collection (node/container/system metrics).

Important: in this setup, container logs and Kubernetes API events are intentionally disabled in Elastic Agent to avoid duplication with Fluent Bit and `kubernetes-event-exporter`.

Quick checks:

```bash
kubectl get daemonset -n elastic-agent
kubectl get pods -n elastic-agent -o wide
kubectl logs -n elastic-agent daemonset/elastic-agent --tail=200
```

What to verify:

- DaemonSet desired pods equals ready pods (one pod per node)
- no crash loop or repeated restarts on agent pods
- metrics are visible in Elastic index pattern `metrics-*`

Kibana investigation tips:

- filter by cluster: `"aws.tags.eks:cluster-name": "Workflows"`
- use `kubernetes.container.*` fields for container-level metrics, e.g. `kubernetes.container.memory.usage.bytes`

Component documentation:

- `docs/infrastructure/components/elastic.agent.md`

### kubernetes-event-exporter

Exports Kubernetes events to observability systems.

Configuration reference:

[infra/charts/event.exporter.ts](../infra/charts/event.exporter.ts)

### Argo Workflows

Argo is the workflow engine running business workloads.

Configuration reference:

[infra/charts/argo.workflows.ts](../infra/charts/argo.workflows.ts)

## Quick triage checklist

Use this sequence for first response:

1. `kubectl get services --all-namespaces`
2. `kubectl get nodes`
3. `kubectl get pods -A`
4. `kubectl get events -A --sort-by=.metadata.creationTimestamp | tail -n 100`
5. `kubectl logs <POD_NAME> -n <NAMESPACE>`
6. Validate CloudWatch and Elastic Search ingestion paths
