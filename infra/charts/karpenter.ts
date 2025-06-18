import { Chart, ChartProps, Duration, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { Ec2NodeClass, Ec2NodeClassSpecBlockDeviceMappingsEbsVolumeType } from '../imports/karpenter.k8s.aws.js';
import { NodePool } from '../imports/karpenter.sh.js';
import { applyDefaultLabels } from '../util/labels.js';

export interface KarpenterProps {
  /**
   * Name of the kubernetes cluster
   *
   * @example "Workflows"
   **/
  clusterName: string;
  /**
   * Name of the service account for karpenter
   *
   * @example "karpenter-sa"
   * */
  saName: string;
  /**
   * Role Arn for the service account to use
   *
   * @example "arn:aws:iam::1234567890:role/KarpenterSa"
   */
  saRoleArn: string;
  /**
   * EKS cluster endpoint URL
   *
   * @example "https://15A3F77065B0E8F949F66.gr7.ap-southeast-2.eks.amazonaws.com"
   */
  clusterEndpoint: string;
  /**
   * Name of the instance profile to use
   *
   * @example "Workflow-InstanceProfile"
   **/
  instanceProfile: string;
}

/**
 * Karpenter chart version and application version are following the same increments
 *
 * https://github.com/aws/karpenter/blob/7c989a2bfae43d4e73235aca0af50b8008c67b68/charts/karpenter/Chart.yaml#L5C10-L5C16
 */
const version = 'v0.31.1';

export class Karpenter extends Chart {
  constructor(scope: Construct, id: string, props: KarpenterProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'karpenter', version, 'karpenter', 'workflows'));

    // Deploying the CRD
    const crd = new Helm(this, 'karpenter-crd', {
      chart: 'oci://public.ecr.aws/karpenter/karpenter-crd',
      namespace: 'karpenter',
      version,
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
    const karpenter = new Helm(this, 'karpenter', {
      chart: 'oci://public.ecr.aws/karpenter/karpenter',
      namespace: 'karpenter',
      version,
      values: {
        serviceAccount: {
          create: false,
          name: props.saName,
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

    karpenter.node.addDependency(crd);
  }
}

export class KarpenterProvisioner extends Chart {
  constructor(scope: Construct, id: string, props: KarpenterProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'karpenter', version, 'karpenter', 'workflows'));

    const templateName = `karpenter-template`;
    const template = new Ec2NodeClass(this, 'template', {
      metadata: { name: templateName },
      spec: {
        amiSelectorTerms: [{ alias: 'bottlerocket' }],
        // Subnets need to be opted into, ideally a tag on subnets would be the best bet here
        // but CDK does not easily allow us to tag Subnets that are not created by us
        subnetSelectorTerms: [{ tags: { Name: '*' } }],
        //subnetSelector: { Name: '*' },
        securityGroupSelectorTerms: [{ tags: { [`kubernetes.io/cluster/${props.clusterName}`]: 'owned' } }],
        // securityGroupSelector: { [`kubernetes.io/cluster/${props.clusterName}`]: 'owned' },
        instanceProfile: props.instanceProfile,
        blockDeviceMappings: [
          {
            deviceName: '/dev/xvdb',
            ebs: {
              volumeType: Ec2NodeClassSpecBlockDeviceMappingsEbsVolumeType.GP3,
              volumeSize: '200Gi',
              deleteOnTermination: true,
            },
          },
        ],
      },
    });

    const provisionAmd64Spot = new NodePool(this, 'ClusterAmd64WorkerNodesSpot', {
      metadata: { name: `karpenter-amd64-spot`, namespace: 'karpenter' },
      spec: {
        // Ensure only pods that tolerate spot run on spot instance types
        // to prevent long running pods (eg kube-dns) being moved.
        taints: [{ key: 'karpenter.sh/capacity-type', value: 'spot', effect: 'NoSchedule' }],
        requirements: [
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['spot'] },
          { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64'] },
          { key: 'karpenter.k8s.aws/instance-family', operator: 'In', values: ['c5', 'c6i', 'c6a'] },
        ],
        limits: { }
        //limits: { resources: { cpu: ProvisionerSpecLimitsResources.fromNumber(2000) } },
        providerRef: { ...AwsNodeTemplate.GVK, name: templateName },
        ttlSecondsAfterEmpty: Duration.minutes(1).toSeconds(), // optional, but never scales down if not set
      },
    });

    const provisionAmd64OnDemand = new Provisioner(this, 'ClusterAmd64WorkerNodesOnDemand', {
      metadata: { name: `karpenter-amd64-on-demand`, namespace: 'karpenter' },
      spec: {
        taints: [
          // Ensure only pods that tolerate karpenter's capacity run on this node
          // to prevent long running pods (eg kube-dns) being moved.
          { key: 'karpenter.sh/capacity-type', value: 'on-demand', effect: 'NoSchedule' },
        ],
        requirements: [
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['on-demand'] },
          { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64'] },
          { key: 'karpenter.k8s.aws/instance-family', operator: 'In', values: ['c5', 'c6i', 'c6a'] },
        ],
        limits: { resources: { cpu: ProvisionerSpecLimitsResources.fromNumber(2000) } },
        providerRef: { ...AwsNodeTemplate.GVK, name: templateName },
        ttlSecondsAfterEmpty: Duration.minutes(1).toSeconds(), // optional, but never scales down if not set
      },
    });

    const provisionArm64 = new Provisioner(this, 'ClusterArmWorkerNodes', {
      metadata: { name: `karpenter-arm64-spot`, namespace: 'karpenter' },
      spec: {
        taints: [
          // Instances that want ARM have to tolerate the arm taint
          // This prevents some pods from accidentally trying to start on ARM
          { key: 'kubernetes.io/arch', value: 'arm64', effect: 'NoSchedule' },
          // Ensure only pods that tolerate spot run on spot instance types
          // to prevent long running pods (eg kube-dns) being moved.
          { key: 'karpenter.sh/capacity-type', value: 'spot', effect: 'NoSchedule' },
        ],
        requirements: [
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['spot'] },
          { key: 'kubernetes.io/arch', operator: 'In', values: ['arm64'] },
          { key: 'karpenter.k8s.aws/instance-family', operator: 'In', values: ['c7g', 'c6g'] },
        ],
        limits: { resources: { cpu: ProvisionerSpecLimitsResources.fromNumber(2000) } },
        providerRef: { ...AwsNodeTemplate.GVK, name: templateName },
        ttlSecondsAfterEmpty: Duration.minutes(1).toSeconds(), // optional, but never scales down if not set
      },
    });

    provisionAmd64Spot.node.addDependency(template);
    provisionAmd64OnDemand.node.addDependency(template);
    provisionArm64.node.addDependency(template);
  }
}
