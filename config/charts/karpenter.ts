import { Chart, ChartProps, Duration, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import {
  AwsNodeTemplateSpec,
  AwsNodeTemplateSpecBlockDeviceMappingsEbsVolumeSize,
} from '../imports/karpenter.k8s.aws.js';
import { Provisioner, ProvisionerSpecLimitsResources } from '../imports/karpenter.sh.js';
import { applyDefaultLabels } from '../util/labels.js';

export interface KarpenterProps {
  clusterName: string;
  saRoleName: string;
  saRoleArn: string;
  clusterEndpoint: string;
  instanceProfile: string;
}

export class Karpenter extends Chart {
  constructor(scope: Construct, id: string, props: KarpenterProps & ChartProps) {
    // TODO: What is the component name? 'karpenter' or 'autoscaling'?
    super(scope, id, applyDefaultLabels(props, 'karpenter', '', 'karpenter', 'workflows'));

    // Deploying the CRD
    new Helm(this, 'karpenter-crd', {
      chart: 'oci://public.ecr.aws/karpenter/karpenter-crd',
      namespace: 'karpenter',
      version: 'v0.31.0',
    });

    // Karpenter is using `oci` rather than regular helm repo: https://gallery.ecr.aws/karpenter/karpenter.
    // This Helm constructor has been tricked to be able to use `oci`,
    // the `oci` repo is passed inside `chart` instead of `repo` so the generated `helm`
    // command is the following:
    // [
    //   'template',
    //   '-f',
    //   '/tmp/cdk8s-helm-keYZCA/overrides.yaml',
    //   '--version',
    //   'v0.31.0',
    //   '--namespace',
    //   'karpenter',
    //   'karpenter-c870a560',
    //   'oci://public.ecr.aws/karpenter/karpenter'
    // ]
    new Helm(this, 'karpenter', {
      chart: 'oci://public.ecr.aws/karpenter/karpenter',
      namespace: 'karpenter',
      version: 'v0.31.0',
      values: {
        serviceAccount: {
          create: false,
          name: props.saRoleName,
          annotations: { 'eks.amazonaws.com/role-arn': props.saRoleArn },
        },
        settings: {
          aws: {
            clusterName: props.clusterName,
            clusterEndpoint: props.clusterEndpoint,
            defaultInstanceProfile: props.instanceProfile,
          },
        },
      },
    });
  }
}

export class KarpenterProvisioner extends Chart {
  constructor(scope: Construct, id: string, props: KarpenterProps & ChartProps) {
    // TODO: What is the component name? 'karpenter' or 'autoscaling'?
    super(scope, id, applyDefaultLabels(props, 'karpenter', '', 'karpenter', 'workflows'));

    const provider: AwsNodeTemplateSpec = {
      amiFamily: 'Bottlerocket',
      subnetSelector: { BaseVPC: 'true' },
      securityGroupSelector: { [`kubernetes.io/cluster/${props.clusterName}`]: 'owned' },
      instanceProfile: props.instanceProfile,
      blockDeviceMappings: [
        {
          deviceName: '/dev/xvdb',
          ebs: {
            volumeType: 'gp3',
            volumeSize: '200Gi',
            deleteOnTermination: true,
          },
        },
      ],
    };

    new Provisioner(this, 'ClusterAmd64WorkerNodes', {
      metadata: { name: `eks-karpenter-${props.clusterName}-amd64`.toLowerCase(), namespace: 'karpenter' },
      spec: {
        requirements: [
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['spot'] },
          { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64'] },
          { key: 'karpenter.k8s.aws/instance-family', operator: 'In', values: ['c5', 'c6i', 'c6a'] },
        ],
        limits: { resources: { cpu: ProvisionerSpecLimitsResources.fromString('20000m') } },
        provider,
        ttlSecondsAfterEmpty: Duration.minutes(1).toSeconds(), // optional, but never scales down if not set
      },
    });

    new Provisioner(this, 'ClusterArmWorkerNodes', {
      metadata: { name: `eks-karpenter-${props.clusterName}-arm64`.toLowerCase(), namespace: 'karpenter' },
      spec: {
        //Instances that want ARM have to tolerate the arm taint
        // This prevenkarpenter-c870a560-76646d448b-fcq6lts some pods from accidentally trying to start on ARM
        taints: [
          { key: 'kubernetes.io/arch', value: 'arm64', effect: 'NoSchedule' },
          { key: 'karpenter.sh/capacity-type', value: 'spot', effect: 'NoSchedule' },
        ],
        requirements: [
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['spot'] },
          { key: 'kubernetes.io/arch', operator: 'In', values: ['arm64'] },
          { key: 'karpenter.k8s.aws/instance-family', operator: 'In', values: ['c7g', 'c6g'] },
        ],
        limits: { resources: { cpu: ProvisionerSpecLimitsResources.fromString('20000m') } },
        provider,
        ttlSecondsAfterEmpty: Duration.minutes(1).toSeconds(), // optional, but never scales down if not set
      },
    });
  }
}
