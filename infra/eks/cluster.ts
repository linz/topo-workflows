import { KubectlV27Layer } from '@aws-cdk/lambda-layer-kubectl-v27';
import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ClusterLoggingTypes, IpFamily, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import {
  CfnInstanceProfile,
  Effect,
  ManagedPolicy,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { CfnOutputKeys } from '../constants';

interface EksClusterProps extends StackProps {}

export class LinzEksCluster extends Stack {
  /* Cluster ID */
  id: string;
  /** Version of EKS to use, this must be aligned to the `kubectlLayer` */
  version = KubernetesVersion.V1_27;
  /** Argo needs a temporary bucket to store objects */
  tempBucket: Bucket;
  /* Bucket where read/write roles config files are stored */
  configBucket: IBucket;
  vpc: IVpc;
  cluster: Cluster;
  nodeRole: Role;

  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id, props);
    this.id = id;

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
    new CfnOutput(this, CfnOutputKeys.Argo.TempBucketName, { value: this.tempBucket.bucketName });

    this.configBucket = Bucket.fromBucketName(this, 'BucketConfig', 'linz-bucket-config');

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

    // This is the role that the new nodes will start as
    this.nodeRole = new Role(this, 'NodeRole', {
      assumedBy: new ServicePrincipal(`ec2.${Aws.URL_SUFFIX}`),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // `aws-node` needs to assign ipv6 addresses which is not part of the base AmazonEKS_CNI_Policy
    this.nodeRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:AssignIpv6Addresses', 'ec2:UnassignIpv6Addresses'],
        resources: ['arn:aws:ec2:*:*:network-interface/*'],
      }),
    );

    this.configureEks();
  }

  /**
   * Setup the basic interactions between EKS and some of its components
   *
   * This should generally be limited to things that require direct interaction with AWS eg service accounts
   * or name space creation
   */
  configureEks(): void {
    // Karpenter
    this.tempBucket.grantReadWrite(this.nodeRole);
    this.configBucket.grantRead(this.nodeRole);
    this.nodeRole.addToPrincipalPolicy(new PolicyStatement({ actions: ['sts:AssumeRole'], resources: ['*'] }));

    this.cluster.awsAuth.addRoleMapping(this.nodeRole, {
      username: 'system:node:{{EC2PrivateDNSName}}',
      groups: ['system:bootstrappers', 'system:nodes'],
    });

    const namespace = this.cluster.addManifest('namespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'karpenter' },
    });
    const serviceAccount = this.cluster.addServiceAccount('karpenter-controller-sa', { namespace: 'karpenter' });
    serviceAccount.node.addDependency(namespace);
    // Nasty hack so this account has access to spin up EC2s inside of LINZ's network
    serviceAccount.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2SpotFleetTaggingRole'),
    );

    // Allow Karpenter to start ec2 instances
    // @see https://github.com/aws/karpenter/blob/8c33a40733b90aa0bb42a6436152374f7b359f69/website/content/en/docs/getting-started/getting-started-with-karpenter/cloudformation.yaml#L40
    // The current policies are based on https://github.com/eksctl-io/eksctl/blob/main/pkg/cfn/builder/karpenter_test.go#L111
    new Policy(this, 'ControllerPolicy', {
      roles: [serviceAccount.role],
      statements: [
        new PolicyStatement({
          actions: [
            'ec2:CreateFleet',
            'ec2:CreateLaunchTemplate',
            'ec2:CreateTags',
            'ec2:DescribeAvailabilityZones',
            'ec2:DescribeInstanceTypeOfferings',
            'ec2:DescribeInstanceTypes',
            'ec2:DescribeInstances',
            'ec2:DescribeLaunchTemplates',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeSubnets',
            'ec2:DeleteLaunchTemplate',
            'ec2:RunInstances',
            'ec2:TerminateInstances',
            'ec2:DescribeImages',
            'ec2:DescribeSpotPriceHistory',
            'iam:PassRole',
            'iam:CreateServiceLinkedRole',
            'ssm:GetParameter',
            'pricing:GetProducts',
            // LINZ requires instances to be encrypted with a KMS key
            'kms:Encrypt',
            'kms:Decrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:CreateGrant',
            'kms:DescribeKey',
          ],
          resources: ['*'],
        }),
      ],
    });

    const instanceProfile = new CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [this.nodeRole.roleName],
      instanceProfileName: `${this.cluster.clusterName}-${this.id}`, // Must be specified to avoid CFN error
    });
    // Save configuration for CDK8s to access it
    new CfnOutput(this, CfnOutputKeys.Karpenter.DefaultInstanceProfile, { value: instanceProfile.ref });
    new CfnOutput(this, CfnOutputKeys.Karpenter.ClusterEndpoint, { value: this.cluster.clusterEndpoint });
    new CfnOutput(this, CfnOutputKeys.Karpenter.ServiceAccountRoleArn, { value: serviceAccount.role.roleArn });
    new CfnOutput(this, CfnOutputKeys.Karpenter.ServiceAccountName, { value: serviceAccount.serviceAccountName });

    // Use fluent bit to ship logs from eks into aws
    const fluentBitNs = this.cluster.addManifest('FluentBitNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'fluentbit' },
    });
    const fluentBitSa = this.cluster.addServiceAccount('FluentBitServiceAccount', {
      name: 'fluentbit-sa',
      namespace: 'fluentbit',
    });
    // https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
    fluentBitSa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    fluentBitSa.role.addToPrincipalPolicy(
      new PolicyStatement({ actions: ['logs:PutRetentionPolicy'], resources: ['*'], effect: Effect.ALLOW }),
    );
    fluentBitSa.node.addDependency(fluentBitNs); // Ensure the namespace created first
    new CfnOutput(this, CfnOutputKeys.FluentBit.ServiceAccountName, { value: fluentBitSa.serviceAccountName });

    // Basic constructs for argo to be deployed into
    const argoNs = this.cluster.addManifest('ArgoNameSpace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'argo' },
    });
    const argoRunnerSa = this.cluster.addServiceAccount('ArgoRunnerServiceAccount', {
      name: 'workflow-runner-sa',
      namespace: 'argo',
    });
    argoRunnerSa.node.addDependency(argoNs);
    new CfnOutput(this, 'ArgoRunnerServiceAccountRoleArn', { value: argoRunnerSa.role.roleArn });
    new CfnOutput(this, CfnOutputKeys.Argo.RunnerServiceAccountName, { value: argoRunnerSa.serviceAccountName });

    // give read/write on the temporary (scratch) bucket
    this.tempBucket.grantReadWrite(argoRunnerSa.role);
    // give permission to the sa to assume a role
    argoRunnerSa.role.addToPrincipalPolicy(new PolicyStatement({ actions: ['sts:AssumeRole'], resources: ['*'] }));
  }
}
