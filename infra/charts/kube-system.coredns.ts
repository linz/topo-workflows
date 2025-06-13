import { Chart, ChartProps } from 'cdk8s';
import * as kplus from 'cdk8s-plus-32';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

/** Configure CoreDNS to output a JSON object for its log files */
export const CoreFileJsonLogFormat = `{"remoteIp":"{remote}","remotePort":{port},"protocol":"{proto}","queryId":"{>id}","queryType":"{type}","queryClass":"{class}","queryName":"{name}","querySize":{size},"dnsSecOk":"{>do}","responseCode":"{rcode}","responseFlags":"{>rflags}","responseSize":{rsize}}`;

/**
 * This cluster is setup as dual ipv4/ipv6 where ipv4 is used for external traffic
 * and ipv6 for internal traffic.
 *
 * This means all traffic ingressing/egressing the cluster must go over ipv4.
 *
 * By default coredns will resolve AAAA (ipv6) records for external hosts even though
 * the cluster is unable to reach them
 *
 * This configuration splits coredns into two zones
 *
 * - `.cluster.local` - internal to the cluster
 * - `.` - everything else
 *
 * The internal cluster allows `ipv6` resolutions, while `.` prevents `AAAA` resolutions using
 * ```
 *  template ANY AAAA {
 *     rcode NOERROR
 * }
 * ```
 *
 */
export class CoreDns extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'coredns', 'v1', 'kube-dns', 'kube-dns'));

    new kplus.ConfigMap(this, 'coredns', {
      metadata: { name: 'coredns', namespace: 'kube-system' },
      data: {
        // FIXME: is there a better way of handling config files inside of cdk8s
        Corefile: `
cluster.local:53 {
    log . ${CoreFileJsonLogFormat}
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    prometheus :9153
    ready :8181
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}

.:53 {
    log . ${CoreFileJsonLogFormat}
    errors
    health
    template ANY AAAA {
      rcode NOERROR
    }
    prometheus :9153
    ready :8181
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}`,
      },
    });
  }
}
