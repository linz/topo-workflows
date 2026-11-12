### Production smoke test baseline (9 November 2026)

**Test configuration**

- **Workflow template:** `imagery-standardising`
- **Reusable manifest:** `~/k8s-upgrade-test/test-imagery-standardising.yaml`
- **Namespace:** `argo`
- **Input:** `s3://linz-workflows-scratch/smcgann/k8s-upgrade-testing/inputs/`
- **Input files:** Three TIFFs (`BX24_5000_0405.tif`, `BX24_5000_0406.tif`, `BX24_5000_0407.tif`)
- **Ticket:** `TDE-2202`
- **ODR publication:** Disabled (`publish_to_odr: "false"`)
- **Delete existing ODR items:** Disabled (`delete_all_existing_items: "false"`)

**Baseline result**

| Field | Result |
|---|---|
| Workflow | `test-pre-upgrade-bqfjw` |
| Status | Succeeded |
| Duration | 4m 11s |
| Progress | 10/10 |
| ODR publication | Skipped |
| Exit handler | Succeeded |

The workflow successfully completed imagery standardisation, collection creation, overview generation, STAC validation and configuration generation.

**Repeat after each deployment**

1. Open the reusable manifest:

   ```bash
   code ~/k8s-upgrade-test/test-imagery-standardising.yaml
   ```

2. Update `metadata.generateName` to identify the deployment:

   | Deployment | Prefix |
   |---|---|
   | Conditional queues | `test-conditional-queues-` |
   | Karpenter | `test-karpenter-upgrade-` |
   | Kubernetes 1.35 | `test-k8s-135-` |
   | Kubernetes 1.36 | `test-k8s-136-` |
   | Kubernetes 1.37 | `test-k8s-137-` |
   | CoreDNS, if required | `test-coredns-` |

3. Validate and submit:

   ```bash
   argo lint ~/k8s-upgrade-test/test-imagery-standardising.yaml

   argo submit -n argo \
     ~/k8s-upgrade-test/test-imagery-standardising.yaml \
     --watch
   ```

4. Record the generated workflow name and verify:
   - [ ] Workflow succeeded (10/10)
   - [ ] Processing steps succeeded
   - [ ] `publish-odr` skipped
   - [ ] No unexpected errors
   - [ ] Expected outputs verified
   - [ ] Result recorded in deployment checklist

**Important:** Confirm the production AWS account and Kubernetes context before submitting. Reuse the same input files and processing parameters to keep results comparable. Only submit once per test unless a rerun is required.
---

## Round 1: Queue changes

**PR:** __________________

### Step 1. Merge and deploy

- [ ] Merge queue PR
- [ ] Wait for GitHub Actions and CloudFormation deployment to complete
- [ ] Confirm deployment succeeded

### Step 2. Check queue and Argo health

```bash
kubectl get deployments -A | grep -i argo
kubectl get pods -A | grep -i argo
kubectl get workflows -A
```

Check the actual queue configuration changed by the PR using its relevant deployment or controller configuration.

- [ ] Argo controllers healthy
- [ ] Expected queue configuration deployed
- [ ] No unexpected blocked workflows
- [ ] Existing workflows unaffected

If the PR changes queue concurrency, verify that waiting workflows are admitted when capacity becomes available. Use an isolated, approved test rather than adding unnecessary production load.

### Step 3. Run test workflow

Submit the approved imagery-standardising workflow through its normal production submission path.

```bash
argo get <workflow-name> -n <namespace>
argo watch <workflow-name> -n <namespace>
```

- [ ] Workflow succeeded
- [ ] Expected outputs verified
- [ ] No unexpected queue or scheduling errors

**Workflow name:** __________________  
**Result:** __________________

**Decision:** [ ] Proceed to Karpenter  [ ] Stop and investigate

---

## Round 2: Karpenter upgrade

**PR:** __________________

### Step 1. Merge and deploy

- [ ] Merge Karpenter PR
- [ ] Wait for deployment to complete
- [ ] Confirm deployment succeeded

### Step 2. Check Karpenter

```bash
kubectl get deployments -n karpenter
kubectl get pods -n karpenter
kubectl get nodepools
kubectl get nodeclaims
kubectl get nodes -o wide
```

Check controller logs if necessary:

```bash
kubectl logs -n karpenter \
  -l app.kubernetes.io/name=karpenter \
  --all-containers=true \
  --tail=100
```

- [ ] Karpenter controller healthy
- [ ] Expected NodePools present
- [ ] NodeClaims healthy
- [ ] Nodes `Ready`
- [ ] No new provisioning or scheduling errors

### Step 3. Run test workflow

Submit the approved imagery-standardising workflow.

While it runs, monitor:

```bash
kubectl get nodeclaims -w
```

- [ ] Workflow succeeded
- [ ] Expected outputs verified
- [ ] Pods scheduled successfully
- [ ] New node provisioning successful, if triggered

A workflow using existing nodes does not independently verify Karpenter's ability to provision new nodes. Do not force scaling without approval.

**Workflow name:** __________________  
**Result:** __________________

**Decision:** [ ] Proceed to Kubernetes 1.35  [ ] Stop and investigate

---

## Round 3: Kubernetes 1.35

**PR:** __________________

### Step 1. Merge and deploy

- [ ] Merge Kubernetes 1.35 PR
- [ ] Wait for EKS control plane deployment to complete

### Step 2. Verify Kubernetes version

```bash
aws eks describe-cluster \
  --name "$CLUSTER" \
  --query 'cluster.{Version:version,Status:status}' \
  --output table
```

Expected version: `1.35`. Expected status: `ACTIVE`.

### Step 3. Upgrade and verify managed node groups

List node groups:

```bash
aws eks list-nodegroups \
  --cluster-name "$CLUSTER"
```

Inspect each node group:

```bash
aws eks describe-nodegroup \
  --cluster-name "$CLUSTER" \
  --nodegroup-name <nodegroup-name> \
  --query 'nodegroup.{Version:version,Status:status,Health:health.issues}'
```

Perform the required node group upgrades using the existing approved procedure, then verify:

```bash
kubectl get nodes -o wide
```

- [ ] Control plane at 1.35
- [ ] Managed node groups updated as required
- [ ] Expected nodes `Ready`

### Step 4. Check kube-proxy

```bash
kubectl get daemonset kube-proxy -n kube-system

kubectl get daemonset kube-proxy -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

- [ ] kube-proxy healthy
- [ ] Version compatible with Kubernetes 1.35
- [ ] Update completed if required by the upgrade procedure

### Step 5. Check CoreDNS and DNS

```bash
kubectl get deployment coredns -n kube-system
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Internal DNS:

```bash
kubectl run dns-test \
  --namespace default \
  --image=busybox:1.36 \
  --restart=Never --rm -i \
  --command -- nslookup kubernetes.default.svc.cluster.local
```

External DNS:

```bash
kubectl run dns-test \
  --namespace default \
  --image=busybox:1.36 \
  --restart=Never --rm -i \
  --command -- nslookup example.com
```

- [ ] CoreDNS healthy
- [ ] Internal DNS works
- [ ] External DNS works

### Step 6. Run test workflow

Submit and monitor the approved production-safe imagery-standardising workflow.

- [ ] Workflow succeeded
- [ ] Expected outputs verified
- [ ] No unexpected infrastructure errors

**Workflow name:** __________________  
**Result:** __________________

**Decision:** [ ] Proceed to Kubernetes 1.36  [ ] Stop and investigate

---

## Round 4: Kubernetes 1.36

**PR:** __________________

### Step 1. Merge and deploy

- [ ] Merge Kubernetes 1.36 PR
- [ ] Wait for deployment to complete

### Step 2. Verify control plane and nodes

```bash
aws eks describe-cluster \
  --name "$CLUSTER" \
  --query 'cluster.{Version:version,Status:status}' \
  --output table

aws eks list-nodegroups --cluster-name "$CLUSTER"

kubectl get nodes -o wide
```

Inspect and upgrade each managed node group using the approved procedure.

- [ ] Control plane at 1.36
- [ ] Node groups upgraded as required
- [ ] Nodes `Ready`

### Step 3. Check system components

```bash
kubectl get daemonset kube-proxy -n kube-system
kubectl get deployment coredns -n kube-system
kubectl get pods -n kube-system
kubectl get pods -A
```

Verify kube-proxy compatibility and repeat both DNS lookup commands from Round 3.

- [ ] kube-proxy compatible and healthy
- [ ] CoreDNS healthy
- [ ] Internal and external DNS working
- [ ] No unexpected system pod failures

### Step 4. Run test workflow

- [ ] Workflow succeeded
- [ ] Expected outputs verified
- [ ] No unexpected errors

**Workflow name:** __________________  
**Result:** __________________

**Decision:** [ ] Proceed to Kubernetes 1.37  [ ] Stop and investigate

---

## Round 5: Kubernetes 1.37

**PR:** __________________

### Step 1. Merge and deploy

- [ ] Merge Kubernetes 1.37 PR
- [ ] Wait for deployment to complete

### Step 2. Verify control plane and nodes

```bash
aws eks describe-cluster \
  --name "$CLUSTER" \
  --query 'cluster.{Version:version,Status:status}' \
  --output table

aws eks list-nodegroups --cluster-name "$CLUSTER"

kubectl get nodes -o wide
```

Inspect and upgrade each managed node group using the approved procedure.

- [ ] Control plane at 1.37
- [ ] Node groups upgraded as required
- [ ] Nodes `Ready`

### Step 3. Check system components

```bash
kubectl get daemonset kube-proxy -n kube-system
kubectl get deployment coredns -n kube-system
kubectl get pods -n kube-system
kubectl get pods -A
```

Verify kube-proxy compatibility and repeat both DNS tests from Round 3.

- [ ] kube-proxy compatible and healthy
- [ ] CoreDNS healthy
- [ ] Internal and external DNS working
- [ ] No unexpected system pod failures

### Step 4. Run test workflow

- [ ] Workflow succeeded
- [ ] Expected outputs verified
- [ ] No unexpected errors

**Workflow name:** __________________  
**Result:** __________________

**Decision:** [ ] Proceed to final checks  [ ] Stop and investigate

---

## Round 6: CoreDNS update (only if required separately)

Before updating, confirm whether production CoreDNS is self-managed or EKS-managed.

### Check existing image

```bash
kubectl get deployment coredns -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

If an update is required, follow the documented CoreDNS upgrade procedure using the verified image for production.

After updating:

```bash
kubectl rollout status deployment/coredns -n kube-system
kubectl get deployment coredns -n kube-system
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Repeat both DNS tests from Round 3.

- [ ] Correct CoreDNS image deployed
- [ ] Rollout successful
- [ ] Internal DNS working
- [ ] External DNS working
- [ ] Test workflow succeeded
- [ ] Expected outputs verified

---

## Final production checks

After all rounds:

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl get nodepools
kubectl get nodeclaims
kubectl get workflows -A

kubectl get events -A \
  --field-selector type=Warning \
  --sort-by=.lastTimestamp
```

- [ ] All expected nodes `Ready`
- [ ] Karpenter healthy
- [ ] CoreDNS and kube-proxy healthy
- [ ] Queue behaviour functioning
- [ ] Existing production workflows healthy
- [ ] No unexplained new warning events
- [ ] Successful test workflow recorded after each PR

## Deployment results

| Round | Change | Workflow name | Result | Approved to proceed |
|---|---|---|---|---|
| 1 | Queues | | | |
| 2 | Karpenter | | | |
| 3 | Kubernetes 1.35 | | | |
| 4 | Kubernetes 1.36 | | | |
| 5 | Kubernetes 1.37 | | | |
| 6 | CoreDNS, if needed | | | |

## If something fails

1. Stop. Do not merge the next PR.
2. Record the failing workflow or component.
3. Check GitHub Actions, CloudFormation, Kubernetes events and relevant logs.
4. Discuss remediation with Tobias.
5. Repeat the failed checks and smoke test before continuing.

EKS control plane upgrades cannot be downgraded. Follow the agreed recovery procedure rather than attempting a Kubernetes version rollback.