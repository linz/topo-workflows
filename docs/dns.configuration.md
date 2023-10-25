# Debugging DNS issues

Because our default cluster is setup as ipv6/ipv4 it can cause a number of connection issues, below are some tips for trying to figure out where the connections are failing.

## Debugging tool installs

To add some debugging tools to your container

Start a shell on the container

```bash
k exec -n :namespace -it :podName -- /bin/bash
```

Install basic dns utils `dig` `ping` `wget` and `curl`

```bash
apt install dnsutils iptools-ping wget curl
```

### Name resolution

Check that the dns can be resolved

```bash
dig google.com # Lookups A (IPv4) record for google.com
dig google.com AAAA # lookup AAAA (IPv6) records
```

Check that a ipv4 connection can be made

```bash
ping google.com # should resolve ipv4
```

### Cluster DNS resolution

Check DNS can resolve other services

K8s host names follow a common pattern

```
:service.:namespace.svc.cluster.local
```

Because this cluster is ipv6 `AAAA` records should resolve to a ipv6 record and `A` should not exist

```bash
dig AAAA kube-dns.kube-system.svc.cluster.local +short
dig A kube-dns.kube-system.svc.cluster.local +short
```

### AWS testing

Installing the AWS Cli can cause a huge amount of dependencies to be installed, sometimes it is easier to just use `s5cmd`.

Download the package for your arch (arm64 vs amd64) https://github.com/peak/s5cmd/releases

Using a [public imagery bucket](https://github.com/linz/imagery)

```bash
s5cmd --no-sign-request ls s3://nz-imagery/
s5cmd --no-sign-request cat s3://nz-imagery/catalog.json
```

### Script testing

Depending on the container you may have access to scripting languages.

#### NodeJS

file: index.mjs

```javascript
fetch('https://google.com').then((c) => console.log(c));

import * as dns from 'dns/promises'

await dns.resolve('google.com', 'A');
await dns.resolve('google.com', 'AAAA');
```

```bash
node --version
node index.mjs
```
