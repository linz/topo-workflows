# Node Local DNS

When large [argo](./argo.workflows.md) jobs are submitted the kubernetes cluster can sometimes scale up very quickly which can overwhelm the coredns DNS resolvers that are running on the primary nodes.

To prevent the overload a DNS cache is installed on every new node when it starts.

It is based off https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/ and it greatly reduces the load on the primary DNS servers.

## Debugging DNS problems with node local DNS

If DNS problems occur while node local dns is running, it is recommended to turn it off using the `UseNodeLocalDns = false` constant in `infra/constants.ts`

## Watching DNS requests

By default the DNS cache will log any external DNS requests it is resolving (anything that is not ending with `.cluster.local`) since there can be a large number of dns cache pods the following command will tail the logs from

```
kubectl logs -n kube-system --all-containers=true -f daemonset/node-local-dns --since=1m --timestamps=true --prefix=true
```

### Structured logs

`coredns` does not provide a simple way of constructing a structured log from the DNS request, it does provide a template system which can be used to craft a JSON log line, if the log line is in structured format like JSON it can be more easily processed into something like elasticsearch for additional debugging.

For the current log format see `CoreFileJsonLogFormat` and below is a example log request

```json
{
  "remoteIp": "[2406:da1c:afb:bc0b:d0e3::6]",
  "remotePort": 43621,
  "protocol": "udp",
  "queryId": "14962",
  "queryType": "A",
  "queryClass": "IN",
  "queryName": "logs.ap-southeast-2.amazonaws.com.",
  "querySize": 51,
  "dnsSecOk": "false",
  "responseCode": "NOERROR",
  "responseFlags": "qr,rd,ra",
  "responseSize": 443
}
```
