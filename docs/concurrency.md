# Concurrency

Some workflows may need limits on how many can be run concurrently. This can
be achieved using Argo's [synchronization][1] feature.

The desired limit can be added in a ConfigMap in [infra/charts/argo.semaphores.ts][2], e.g.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: semaphores
  namespace: argo
data:
  standardising: '2'
```

which shows a limit of `2` added to the key `standardising`. This can then
be referenced by adding a synchronization section to the desired workflow,
which refers to the ConfigMap name and key:

```yaml
synchronization:
  semaphore:
    configMapKeyRef:
      name: semaphores
      key: standardising
```

Now Argo will only allow two instances of the workflow to run concurrently.
Any further instances which are started while two are running will be queued,
and start automatically when running workflows complete.

[1]: https://argoproj.github.io/argo-workflows/synchronization/
[2]: infra/charts/argo.semaphores.ts
