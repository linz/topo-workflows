import { KubectlV27Layer } from '@aws-cdk/lambda-layer-kubectl-v27';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ClusterLoggingTypes, IpFamily, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface EksClusterProps extends StackProps {}

export class LinzEksCluster extends Stack {
  tempBucket: Bucket;
  vpc: IVpc;
  version = KubernetesVersion.V1_27;
  cluster: Cluster;

  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id, props);

    this.tempBucket = new Bucket(this, 'Artifacts', {
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
      kubectlLayer: new KubectlV27Layer(this, 'KubeCtlLayer'),
      ipFamily: IpFamily.IP_V6,
      clusterLogging: [ClusterLoggingTypes.API, ClusterLoggingTypes.CONTROLLER_MANAGER, ClusterLoggingTypes.SCHEDULER],
    });

    const nodeGroup = this.cluster.addNodegroupCapacity('cluster-default', {
      instanceTypes: [
        new InstanceType('c7i.large'),
        new InstanceType('c7a.large'),
        new InstanceType('c6i.large'),
        new InstanceType('c6a.large'),
        new InstanceType('m6i.large'),
        new InstanceType('m6a.large'),
        new InstanceType('c5.large'),
        new InstanceType('c5a.large'),
      ],
      /**
       * c6i.large: ~$70/month, t3.small: ~$12/month.
       * Compare instance types and costs at https://instances.vantage.sh/
       * Instances are requested in order listed.
       * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html#managed-node-group-capacity-types
       **/

      minSize: 2,
      amiType: NodegroupAmiType.BOTTLEROCKET_X86_64,
      subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });
    this.tempBucket.grantReadWrite(nodeGroup.role);
  }
}
