import { KubectlV27Layer } from '@aws-cdk/lambda-layer-kubectl-v27';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ClusterLoggingTypes, IpFamily, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { Role } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface EksClusterProps extends StackProps {}

export class LinzEksCluster extends Stack {
  /** Version of EKS to use, this must be aligned to the `kubectlLayer` */
  version = KubernetesVersion.V1_27;
  /** Argo needs a temporary bucket to store objects */
  tempBucket: Bucket;

  vpc: IVpc;

  cluster: Cluster;

  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id, props);

    this.tempBucket = new Bucket(this, 'Scratch', {
      /** linz-workflows-scratch */
      bucketName: `linz-${id.toLowerCase()}-scratch`,
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          /** All artifacts are deleted after 90 days */
          expiration: Duration.days(90),
          /** This bucket is not used for multipart uploads so clean them up quickly */
          abortIncompleteMultipartUploadAfter: Duration.days(3),
        },
      ],
    });

    this.vpc = Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    this.cluster = new Cluster(this, `Eks${id}`, {
      clusterName: id,
      version: this.version,
      vpc: this.vpc,
      defaultCapacity: 0,
      vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
      /** This must align to Cluster version: {@link version} */
      kubectlLayer: new KubectlV27Layer(this, 'KubeCtlLayer'),
      /** To prevent IP exhaustion when running huge workflows run using ipv6 */
      ipFamily: IpFamily.IP_V6,
      clusterLogging: [ClusterLoggingTypes.API, ClusterLoggingTypes.CONTROLLER_MANAGER, ClusterLoggingTypes.SCHEDULER],
    });

    const nodeGroup = this.cluster.addNodegroupCapacity('ClusterDefault', {
      /**
       * c6i.large: ~$70/month, t3.small: ~$12/month.
       * Compare instance types and costs at https://instances.vantage.sh/
       * Instances are requested in order listed.
       * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html#managed-node-group-capacity-types
       **/
      instanceTypes: ['c6i.large', 'c6a.large'].map((f) => new InstanceType(f)),
      minSize: 2,
      amiType: NodegroupAmiType.BOTTLEROCKET_X86_64,
      subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });
    this.tempBucket.grantReadWrite(nodeGroup.role);

    // Grant the AWS Admin user ability to view the cluster
    const accountAdminRole = Role.fromRoleName(this, 'AccountAdminRole', 'AccountAdminRole');
    this.cluster.awsAuth.addMastersRole(accountAdminRole);

    this.configureEks();
  }

  /**
   * Setup the basic interactions between EKS and some of its components
   *
   * This should generally be limited to things that require direct interaction with AWS eg service accounts
   * or name space creation
   */
  configureEks(): void {
    // Use fluent bit to ship logs from eks into aws
    const fluentBitNs = this.cluster.addManifest('FluentBitNamespace', {
      kind: 'Namespace',
      metadata: { name: 'fluent-bit' },
    });
    const fluentBitSa = this.cluster.addServiceAccount('FluentBitServiceAccount', {
      name: 'fluent-bit-sa',
      namespace: 'fluent-bit',
    });
    fluentBitSa.node.addDependency(fluentBitNs); // Ensure the namespace created first

    // basic  constructs for
    const argoNs = this.cluster.addManifest('ArgoNameSpace', { kind: 'Namespace', metadata: { name: 'argo' } });
    const argoRunnerSa = this.cluster.addServiceAccount('ArgoRunnerServiceAccount', {
      name: 'argo-runner-sa',
      namespace: 'argo',
    });
    argoNs.node.addDependency(argoRunnerSa);
  }
}
