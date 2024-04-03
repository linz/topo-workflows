import { ApiObject, Chart, ChartProps, JsonPatch, Size } from 'cdk8s';
import * as kplus from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';
import { CoreFileJsonLogFormat } from './kube-system.coredns.js';

export interface NodeLocalDnsProps extends ChartProps {
  /** cluster networking configuration */
  serviceIpv6Cidr: string;

  bindAddressSuffix?: string;
}

export class NodeLocalDns extends Chart {
  constructor(scope: Construct, id: string, props: NodeLocalDnsProps) {
    super(scope, id, {
      ...applyDefaultLabels(props, 'node-local-dns', 'v1', 'kube-dns', 'kube-dns'),
      namespace: 'kube-system',
    });

    const bindAddressSuffix = props.bindAddressSuffix ?? 'ffaa';

    const serviceBaseAddress = props.serviceIpv6Cidr.slice(0, props.serviceIpv6Cidr.lastIndexOf('/'));

    const bindAddress = serviceBaseAddress + '::' + bindAddressSuffix;
    const upstreamDns = serviceBaseAddress + '::a'; // TODO is this always `::a` ?

    const serviceAccount = new kplus.ServiceAccount(this, 'node-local-dns-sa', {
      metadata: {
        name: 'node-local-dns',
        namespace: 'kube-system',
        labels: { 'kubernetes.io/cluster-service': 'true' },
      },
    });

    const dnsUpstream = new kplus.Service(this, 'kube-dns-upstream', {
      metadata: {
        namespace: 'kube-system',
        name: 'kube-dns-upstream',
        labels: {
          'kubernetes.io/cluster-service': 'true',
          'kubernetes.io/name': 'KubeDNSUpstream',
          'k8s-app': 'kube-dns',
        },
      },
      ports: [
        { name: 'dns', port: 53, protocol: kplus.Protocol.UDP, targetPort: 53 },
        { name: 'dns-tcp', port: 53, protocol: kplus.Protocol.TCP, targetPort: 53 },
      ],
      selector: kplus.Pods.select(this, 'kube-dns-upstream-pods', { labels: { 'k8s-app': 'kube-dns' } }),
    });

    const cm = new kplus.ConfigMap(this, 'node-local-dns-config', {
      metadata: { name: 'node-local-dns', namespace: 'kube-system' },
      data: {
        Corefile: generateCorefile({ bindAddress: bindAddress, upstreamAddress: upstreamDns }),
      },
    });

    const kubeDnsConfig = kplus.ConfigMap.fromConfigMapName(this, 'kube-dns-config-map', 'kube-dns');

    const ds = new kplus.DaemonSet(this, 'node-local-dns-daemon', {
      metadata: {
        name: 'node-local-dns',
        namespace: 'kube-system',
        labels: { 'kubernetes.io/cluster-service': 'true' },
      },

      serviceAccount,
      securityContext: { ensureNonRoot: false },
      dns: { policy: kplus.DnsPolicy.DEFAULT },
      hostNetwork: true,
      podMetadata: {},

      containers: [
        {
          name: 'node-cache',
          securityContext: {
            ensureNonRoot: false,
            allowPrivilegeEscalation: true,
            readOnlyRootFilesystem: false,
            privileged: true,
          },
          image: 'registry.k8s.io/dns/k8s-dns-node-cache:1.22.28',
          resources: { cpu: { request: kplus.Cpu.millis(25) }, memory: { request: Size.mebibytes(5) } }, // { cpu: 25m, 5Mi} ContainerResources
          args: [
            '-localip',
            [bindAddress, upstreamDns].join(','),
            '-conf',
            '/etc/Corefile',
            '-upstreamsvc',
            dnsUpstream.name,
          ],
          ports: [
            { name: 'dns', protocol: kplus.Protocol.UDP, number: 53 },
            // { name: 'dns-tcp', protocol: kplus.Protocol.TCP, number: 53 }, // TODO this is broken, see JSONPatch
            { name: 'metrics', protocol: kplus.Protocol.TCP, number: 9253 },
          ],
          liveness: kplus.Probe.fromHttpGet('/health', { port: 8080 /* TODO:  host: bindAddress */ }),
          volumeMounts: [
            {
              path: '/etc/coredns',
              volume: kplus.Volume.fromConfigMap(this, 'config-volume', cm, {
                name: 'node-local-dns',
                items: { Corefile: { path: 'Corefile.base' } },
              }),
            },
            {
              path: '/etc/kube-dns',
              volume: kplus.Volume.fromConfigMap(this, 'kube-dns-config', kubeDnsConfig, {
                optional: true,
                name: 'kube-dns',
              }),
            },
            {
              path: '/run/xtables.lock',
              readOnly: false,
              volume: kplus.Volume.fromHostPath(this, 'iptables', 'xtables-lock', {
                path: '/run/xtables.lock',
                type: kplus.HostPathVolumeType.FILE_OR_CREATE,
              }),
            },
          ],
        },
      ],
    });

    // ESCAPE hatches to manually overwrite a few configuration options that could not be configured with cdk8s
    const apiDs = ApiObject.of(ds);
    apiDs.addJsonPatch(
      // httpGet.host is missing from kplus.Probe.fromHttpGet
      JsonPatch.add('/spec/template/spec/containers/0/livenessProbe/httpGet/host', bindAddress),
      // TODO where is this defined
      JsonPatch.add('/spec/template/spec/priorityClassName', 'system-node-critical'),
      // unable to add two ports with the same number even though they are different protocols
      JsonPatch.add('/spec/template/spec/containers/0/ports/1', {
        containerPort: 53,
        name: 'dns-tcp',
        protocol: 'TCP',
      }),
      // Unable to set the security context
      JsonPatch.replace('/spec/template/spec/containers/0/securityContext', { capabilities: { add: ['NET_ADMIN'] } }),
    );
  }
}

function generateCorefile(ctx: { bindAddress: string; upstreamAddress: string }): string {
  // __PILLAR___ keys are replaced automatically by the node local dns pod
  return `cluster.local:53 {
      errors
      cache {
              success 9984 30
              denial 9984 5
      }
      reload
      loop
      bind ${ctx.bindAddress} ${ctx.upstreamAddress}
      forward . __PILLAR__CLUSTER__DNS__ {
              force_tcp
      }
      prometheus :9253
      health [${ctx.bindAddress}]:8080
      }
    
  in-addr.arpa:53 {
      errors
      cache 30
      reload
      loop
      bind ${ctx.bindAddress} ${ctx.upstreamAddress}
      forward . __PILLAR__CLUSTER__DNS__ {
              force_tcp
      }
      prometheus :9253
      }
      
  ip6.arpa:53 {
      errors
      cache 30
      reload
      loop
      bind ${ctx.bindAddress} ${ctx.upstreamAddress}
      forward . __PILLAR__CLUSTER__DNS__ {
              force_tcp
      }
      prometheus :9253
      }
    
  .:53 {
      log . ${CoreFileJsonLogFormat}
      errors
      cache 30
      reload
      loop
      template ANY AAAA { 
        rcode NOERROR
      }
      bind ${ctx.bindAddress} ${ctx.upstreamAddress}
      forward . __PILLAR__UPSTREAM__SERVERS__
      prometheus :9253
  }`;
}
