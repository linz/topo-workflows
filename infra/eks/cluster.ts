import { KubectlV33Layer } from '@aws-cdk/lambda-layer-kubectl-v33';
import { Aws, CfnOutput, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { InstanceType, IVpc, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
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
import * as iam from 'aws-cdk-lib/aws-iam';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createHash } from 'crypto';

import { CfnOutputKeys, ScratchBucketName } from '../constants.ts';

interface EksClusterProps extends StackProps {
  /** List of role ARNs to grant access to the cluster */
  maintainerRoleArns: string[];
  /** S3 Batch Restore Role ARN */
  s3BatchRestoreRoleArn: string;
}

export class LinzEksCluster extends Stack {
  /* Cluster ID */
  id: string;
  /** Version of EKS to use, this must be aligned to the `kubectlLayer` */
  version = KubernetesVersion.V1_33;
  /** Argo needs a temporary bucket to store objects */
  tempBucket: IBucket;
  /* Bucket where read/write roles config files are stored */
  configBucket: IBucket;
  vpc: IVpc;
  cluster: Cluster;
  nodeRole: Role;
  s3BatchRestoreRoleArn: string;

  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id, props);
    this.id = id;

    this.tempBucket = Bucket.fromBucketName(this, 'Scratch', ScratchBucketName);

    this.configBucket = Bucket.fromBucketName(this, 'BucketConfig', 'linz-bucket-config');

    this.vpc = Vpc.fromLookup(this, 'Vpc', { tags: { BaseVPC: 'true' } });

    this.s3BatchRestoreRoleArn = props.s3BatchRestoreRoleArn;

    this.cluster = new Cluster(this, `Eks${id}`, {
      clusterName: id,
      version: this.version,
      vpc: this.vpc,
      defaultCapacity: 0,
      vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
      /** This must align to Cluster version: {@link version} */
      kubectlLayer: new KubectlV33Layer(this, 'KubeCtlLayer'),
      /** To prevent IP exhaustion when running huge workflows run using ipv6 */
      ipFamily: IpFamily.IP_V6,
      clusterLogging: [ClusterLoggingTypes.API, ClusterLoggingTypes.CONTROLLER_MANAGER, ClusterLoggingTypes.SCHEDULER],
    });

    const nodeGroup = this.cluster.addNodegroupCapacity('ClusterDefault', {
      /**
       * c6i.large: ~US$60/month, t3.small: ~US$15/month.
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

    //allow the maintainer roles access to the cluster
    for (const roleArn of props.maintainerRoleArns) {
      const roleId = `MaintainerRole-${createHash('sha256').update(roleArn).digest('hex').slice(0, 12)}`;
      const role = Role.fromRoleArn(this, roleId, roleArn, { defaultPolicyName: this.stackName });
      if (!roleArn.includes('AWSReservedSSO_')) {
        role.addToPrincipalPolicy(
          new iam.PolicyStatement({ actions: ['eks:DescribeCluster'], resources: [this.cluster.clusterArn] }),
        );
      } else {
        console.warn(`Skipping policy attachment for SSO-managed role: ${roleArn}`);
      }
      this.cluster.awsAuth.addMastersRole(role);
    }

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

    new CfnOutput(this, CfnOutputKeys.ClusterEndpoint, { value: this.cluster.clusterEndpoint });

    this.configureEks();
  }

  /**
   * Setup the basic interactions between EKS and some of its components
   *
   * This should generally be limited to things that require direct interaction with AWS eg service accounts
   * or name space creation
   */
  configureEks(): void {
    this.tempBucket.grantReadWrite(this.nodeRole);
    this.configBucket.grantRead(this.nodeRole);
    this.nodeRole.addToPrincipalPolicy(new PolicyStatement({ actions: ['sts:AssumeRole'], resources: ['*'] }));

    this.cluster.awsAuth.addRoleMapping(this.nodeRole, {
      username: 'system:node:{{EC2PrivateDNSName}}',
      groups: ['system:bootstrappers', 'system:nodes'],
    });

    // Karpenter - Node autoscaler
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
            'eks:DescribeCluster',
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
    new CfnOutput(this, CfnOutputKeys.KarpenterDefaultInstanceProfile, { value: instanceProfile.ref });
    new CfnOutput(this, CfnOutputKeys.KarpenterServiceAccountRoleArn, { value: serviceAccount.role.roleArn });
    new CfnOutput(this, CfnOutputKeys.KarpenterServiceAccountName, { value: serviceAccount.serviceAccountName });

    // FluentBit - to ship logs from eks into aws
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
    new CfnOutput(this, CfnOutputKeys.FluentBitServiceAccountName, { value: fluentBitSa.serviceAccountName });

    // Argo Workflows

    // Database
    const argoDbSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedArgoDbSG',
      Fn.importValue(CfnOutputKeys.ArgoDbSecurityGroupId),
    );
    // Allow the cluster SG to connect to Argo DB SG
    argoDbSecurityGroup.addIngressRule(
      SecurityGroup.fromSecurityGroupId(this, 'EksSG', this.cluster.clusterSecurityGroupId),
      Port.tcp(5432),
      'EKS to Argo Database',
    );

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
    new CfnOutput(this, CfnOutputKeys.ArgoRunnerServiceAccountName, { value: argoRunnerSa.serviceAccountName });

    // give read/write on the temporary (scratch) bucket
    this.tempBucket.grantReadWrite(argoRunnerSa.role);
    // give permission to the sa to assume a role
    argoRunnerSa.role.addToPrincipalPolicy(new PolicyStatement({ actions: ['sts:AssumeRole'], resources: ['*'] }));
    // give permission to the sa to create S3 Batch Operations jobs
    argoRunnerSa.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['s3:CreateJob'],
        resources: [`arn:aws:s3:${this.region}:${this.account}:job/*`],
      }),
    );
    // give permission to the sa to pass the S3 Batch Operations job role
    argoRunnerSa.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [this.s3BatchRestoreRoleArn],
      }),
    );

    /* Gives read access on ODR public buckets.
     * While those are public buckets, we still need to give permission to Argo
     * as the `--no-sign-request` is not handled in the code.
     */
    Bucket.fromBucketName(this, 'OdrNzCoastal', 'nz-coastal').grantRead(argoRunnerSa.role);
    Bucket.fromBucketName(this, 'OdrNzElevation', 'nz-elevation').grantRead(argoRunnerSa.role);
    Bucket.fromBucketName(this, 'OdrNzImagery', 'nz-imagery').grantRead(argoRunnerSa.role);
    Bucket.fromBucketName(this, 'OdrNzTopography', 'nz-topography').grantRead(argoRunnerSa.role);

    this.createServiceAccountArgoEvents();
  }

  createServiceAccountArgoEvents(): void {
    const argoEventsNsName = 'argo-events';
    const argoEventsNs = this.cluster.addManifest('ArgoEventsNameSpace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: argoEventsNsName },
    });
    const argoEventsSa = this.cluster.addServiceAccount('ArgoEventsServiceAccount', {
      name: 'argo-events-sa',
      namespace: argoEventsNsName,
    });

    argoEventsSa.node.addDependency(argoEventsNs);
    new CfnOutput(this, CfnOutputKeys.ArgoEventsServiceAccountName, { value: argoEventsSa.serviceAccountName });
  }
}
