# Priority Class

Priority classes are used to assign a priority to pods in the kubernetes cluster. This is useful for ensuring that critical workloads are scheduled before less important ones, and also to prevent less critical pods from evicting more important ones during resource contention. See Kubernetes [Docs](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/).

Four priority classes are defined in the `infra/charts/priority.class.ts` file. Two additional priority classes are defined by the EKS cluster itself.

| NAME                        | VALUE      | GLOBAL-DEFAULT | PREEMPTIONPOLICY     |
| --------------------------- | ---------- | -------------- | -------------------- |
| default-priority-no-preempt | 0          | true           | Never                |
| high-priority-no-preempt    | 1000000    | false          | Never                |
| high-priority               | 1000000    | false          | PreemptLowerPriority |
| very-high-priority          | 1500000    | false          | PreemptLowerPriority |
| system-cluster-critical     | 2000000000 | false          | PreemptLowerPriority |
| system-node-critical        | 2000001000 | false          | PreemptLowerPriority |

The `very-high-priority` class is used for Fluentbit and EventExporter to ensure logging.
Argo Workflows Server and Workflow Controller run in `high-priority`.
`default-priority-no-preempt` is set as default and will be used by workflow pods.
`high-priority-no-preempt` has been defined so it can be used by higher priority workflows when needed.
The `system-node-critical` and `system-cluster-critical` classes are used for system pods.
