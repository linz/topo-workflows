# Debugging DNS issues

Because our default cluster is setup as ipv6/ipv4 it can cause a number of connection issues, below are some tips for trying to figure out where the connections are failing.

## Debugging tool installs

To add some debugging tools to your container

Start a shell on the container

```bash
k exec -n :namespace -it :podName -- /bin/bash
```

Install basic networking utils `dig`, `ping`, `ping6`, `wget`, `nslookup`, and `curl`

```bash
apt update && apt install -y dnsutils iputils-ping wget curl
```

Other useful tools may include `tracepath`, `traceroute` and `mtr`

```bash
apt update && apt install -y iputils-tracepath mtr traceroute
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

create a new file `index.mjs`

```javascript
fetch('https://google.com').then((c) => console.log(c));

import * as dns from 'dns/promises';

console.log(await dns.resolve('google.com', 'A'));
console.log(await dns.resolve('google.com', 'AAAA'));
```

Run the file

```bash
node --version
node index.mjs
```

## Node Local DNS

A local DNS cache is running on every node, [node-local-dns](./infrastructure/components/node.local.dns.md) if any DNS issues occur it is recommended to turn the DNS cache off as a first step for debugging
