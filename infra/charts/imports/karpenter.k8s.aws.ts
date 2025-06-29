/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// generated by cdk8s
import { ApiObject, ApiObjectMetadata, GroupVersionKind } from 'cdk8s';
import { Construct } from 'constructs';

/**
 * EC2NodeClass is the Schema for the EC2NodeClass API
 *
 * @schema EC2NodeClass
 */
export class Ec2NodeClass extends ApiObject {
  /**
   * Returns the apiVersion and kind for "EC2NodeClass"
   */
  public static readonly GVK: GroupVersionKind = {
    apiVersion: 'karpenter.k8s.aws/v1',
    kind: 'EC2NodeClass',
  };

  /**
   * Renders a Kubernetes manifest for "EC2NodeClass".
   *
   * This can be used to inline resource manifests inside other objects (e.g. as templates).
   *
   * @param props initialization props
   */
  public static manifest(props: Ec2NodeClassProps = {}): any {
    return {
      ...Ec2NodeClass.GVK,
      ...toJson_Ec2NodeClassProps(props),
    };
  }

  /**
   * Defines a "EC2NodeClass" API object
   * @param scope the scope in which to define this object
   * @param id a scope-local name for the object
   * @param props initialization props
   */
  public constructor(scope: Construct, id: string, props: Ec2NodeClassProps = {}) {
    super(scope, id, {
      ...Ec2NodeClass.GVK,
      ...props,
    });
  }

  /**
   * Renders the object to Kubernetes JSON.
   */
  public override toJson(): any {
    const resolved = super.toJson();

    return {
      ...Ec2NodeClass.GVK,
      ...toJson_Ec2NodeClassProps(resolved),
    };
  }
}

/**
 * EC2NodeClass is the Schema for the EC2NodeClass API
 *
 * @schema EC2NodeClass
 */
export interface Ec2NodeClassProps {
  /**
   * @schema EC2NodeClass#metadata
   */
  readonly metadata?: ApiObjectMetadata;

  /**
   * EC2NodeClassSpec is the top level specification for the AWS Karpenter Provider.
   * This will contain configuration necessary to launch instances in AWS.
   *
   * @schema EC2NodeClass#spec
   */
  readonly spec?: Ec2NodeClassSpec;
}

/**
 * Converts an object of type 'Ec2NodeClassProps' to JSON representation.
 */
export function toJson_Ec2NodeClassProps(obj: Ec2NodeClassProps | undefined): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    metadata: obj.metadata,
    spec: toJson_Ec2NodeClassSpec(obj.spec),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * EC2NodeClassSpec is the top level specification for the AWS Karpenter Provider.
 * This will contain configuration necessary to launch instances in AWS.
 *
 * @schema Ec2NodeClassSpec
 */
export interface Ec2NodeClassSpec {
  /**
   * AMIFamily dictates the UserData format and default BlockDeviceMappings used when generating launch templates.
   * This field is optional when using an alias amiSelectorTerm, and the value will be inferred from the alias'
   * family. When an alias is specified, this field may only be set to its corresponding family or 'Custom'. If no
   * alias is specified, this field is required.
   * NOTE: We ignore the AMIFamily for hashing here because we hash the AMIFamily dynamically by using the alias using
   * the AMIFamily() helper function
   *
   * @schema Ec2NodeClassSpec#amiFamily
   */
  readonly amiFamily?: Ec2NodeClassSpecAmiFamily;

  /**
   * AMISelectorTerms is a list of or ami selector terms. The terms are ORed.
   *
   * @schema Ec2NodeClassSpec#amiSelectorTerms
   */
  readonly amiSelectorTerms: Ec2NodeClassSpecAmiSelectorTerms[];

  /**
   * AssociatePublicIPAddress controls if public IP addresses are assigned to instances that are launched with the nodeclass.
   *
   * @schema Ec2NodeClassSpec#associatePublicIPAddress
   */
  readonly associatePublicIpAddress?: boolean;

  /**
   * BlockDeviceMappings to be applied to provisioned nodes.
   *
   * @schema Ec2NodeClassSpec#blockDeviceMappings
   */
  readonly blockDeviceMappings?: Ec2NodeClassSpecBlockDeviceMappings[];

  /**
   * CapacityReservationSelectorTerms is a list of capacity reservation selector terms. Each term is ORed together to
   * determine the set of eligible capacity reservations.
   *
   * @schema Ec2NodeClassSpec#capacityReservationSelectorTerms
   */
  readonly capacityReservationSelectorTerms?: Ec2NodeClassSpecCapacityReservationSelectorTerms[];

  /**
   * Context is a Reserved field in EC2 APIs
   * https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateFleet.html
   *
   * @schema Ec2NodeClassSpec#context
   */
  readonly context?: string;

  /**
   * DetailedMonitoring controls if detailed monitoring is enabled for instances that are launched
   *
   * @schema Ec2NodeClassSpec#detailedMonitoring
   */
  readonly detailedMonitoring?: boolean;

  /**
   * InstanceProfile is the AWS entity that instances use.
   * This field is mutually exclusive from role.
   * The instance profile should already have a role assigned to it that Karpenter
   * has PassRole permission on for instance launch using this instanceProfile to succeed.
   *
   * @schema Ec2NodeClassSpec#instanceProfile
   */
  readonly instanceProfile?: string;

  /**
   * InstanceStorePolicy specifies how to handle instance-store disks.
   *
   * @schema Ec2NodeClassSpec#instanceStorePolicy
   */
  readonly instanceStorePolicy?: Ec2NodeClassSpecInstanceStorePolicy;

  /**
   * Kubelet defines args to be used when configuring kubelet on provisioned nodes.
   * They are a subset of the upstream types, recognizing not all options may be supported.
   * Wherever possible, the types and names should reflect the upstream kubelet types.
   *
   * @schema Ec2NodeClassSpec#kubelet
   */
  readonly kubelet?: Ec2NodeClassSpecKubelet;

  /**
   * MetadataOptions for the generated launch template of provisioned nodes.
   *
   * This specifies the exposure of the Instance Metadata Service to
   * provisioned EC2 nodes. For more information,
   * see Instance Metadata and User Data
   * (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
   * in the Amazon Elastic Compute Cloud User Guide.
   *
   * Refer to recommended, security best practices
   * (https://aws.github.io/aws-eks-best-practices/security/docs/iam/#restrict-access-to-the-instance-profile-assigned-to-the-worker-node)
   * for limiting exposure of Instance Metadata and User Data to pods.
   * If omitted, defaults to httpEndpoint enabled, with httpProtocolIPv6
   * disabled, with httpPutResponseLimit of 1, and with httpTokens
   * required.
   *
   * @schema Ec2NodeClassSpec#metadataOptions
   */
  readonly metadataOptions?: Ec2NodeClassSpecMetadataOptions;

  /**
   * Role is the AWS identity that nodes use. This field is immutable.
   * This field is mutually exclusive from instanceProfile.
   * Marking this field as immutable avoids concerns around terminating managed instance profiles from running instances.
   * This field may be made mutable in the future, assuming the correct garbage collection and drift handling is implemented
   * for the old instance profiles on an update.
   *
   * @schema Ec2NodeClassSpec#role
   */
  readonly role?: string;

  /**
   * SecurityGroupSelectorTerms is a list of security group selector terms. The terms are ORed.
   *
   * @schema Ec2NodeClassSpec#securityGroupSelectorTerms
   */
  readonly securityGroupSelectorTerms: Ec2NodeClassSpecSecurityGroupSelectorTerms[];

  /**
   * SubnetSelectorTerms is a list of subnet selector terms. The terms are ORed.
   *
   * @schema Ec2NodeClassSpec#subnetSelectorTerms
   */
  readonly subnetSelectorTerms: Ec2NodeClassSpecSubnetSelectorTerms[];

  /**
   * Tags to be applied on ec2 resources like instances and launch templates.
   *
   * @schema Ec2NodeClassSpec#tags
   */
  readonly tags?: { [key: string]: string };

  /**
   * UserData to be applied to the provisioned nodes.
   * It must be in the appropriate format based on the AMIFamily in use. Karpenter will merge certain fields into
   * this UserData to ensure nodes are being provisioned with the correct configuration.
   *
   * @schema Ec2NodeClassSpec#userData
   */
  readonly userData?: string;
}

/**
 * Converts an object of type 'Ec2NodeClassSpec' to JSON representation.
 */
export function toJson_Ec2NodeClassSpec(obj: Ec2NodeClassSpec | undefined): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    amiFamily: obj.amiFamily,
    amiSelectorTerms: obj.amiSelectorTerms?.map((y) => toJson_Ec2NodeClassSpecAmiSelectorTerms(y)),
    associatePublicIPAddress: obj.associatePublicIpAddress,
    blockDeviceMappings: obj.blockDeviceMappings?.map((y) => toJson_Ec2NodeClassSpecBlockDeviceMappings(y)),
    capacityReservationSelectorTerms: obj.capacityReservationSelectorTerms?.map((y) =>
      toJson_Ec2NodeClassSpecCapacityReservationSelectorTerms(y),
    ),
    context: obj.context,
    detailedMonitoring: obj.detailedMonitoring,
    instanceProfile: obj.instanceProfile,
    instanceStorePolicy: obj.instanceStorePolicy,
    kubelet: toJson_Ec2NodeClassSpecKubelet(obj.kubelet),
    metadataOptions: toJson_Ec2NodeClassSpecMetadataOptions(obj.metadataOptions),
    role: obj.role,
    securityGroupSelectorTerms: obj.securityGroupSelectorTerms?.map((y) =>
      toJson_Ec2NodeClassSpecSecurityGroupSelectorTerms(y),
    ),
    subnetSelectorTerms: obj.subnetSelectorTerms?.map((y) => toJson_Ec2NodeClassSpecSubnetSelectorTerms(y)),
    tags:
      obj.tags === undefined
        ? undefined
        : Object.entries(obj.tags).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
    userData: obj.userData,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * AMIFamily dictates the UserData format and default BlockDeviceMappings used when generating launch templates.
 * This field is optional when using an alias amiSelectorTerm, and the value will be inferred from the alias'
 * family. When an alias is specified, this field may only be set to its corresponding family or 'Custom'. If no
 * alias is specified, this field is required.
 * NOTE: We ignore the AMIFamily for hashing here because we hash the AMIFamily dynamically by using the alias using
 * the AMIFamily() helper function
 *
 * @schema Ec2NodeClassSpecAmiFamily
 */
export enum Ec2NodeClassSpecAmiFamily {
  /** AL2 */
  AL2 = 'AL2',
  /** AL2023 */
  AL2023 = 'AL2023',
  /** Bottlerocket */
  BOTTLEROCKET = 'Bottlerocket',
  /** Custom */
  CUSTOM = 'Custom',
  /** Windows2019 */
  WINDOWS2019 = 'Windows2019',
  /** Windows2022 */
  WINDOWS2022 = 'Windows2022',
}

/**
 * AMISelectorTerm defines selection logic for an ami used by Karpenter to launch nodes.
 * If multiple fields are used for selection, the requirements are ANDed.
 *
 * @schema Ec2NodeClassSpecAmiSelectorTerms
 */
export interface Ec2NodeClassSpecAmiSelectorTerms {
  /**
   * Alias specifies which EKS optimized AMI to select.
   * Each alias consists of a family and an AMI version, specified as "family@version".
   * Valid families include: al2, al2023, bottlerocket, windows2019, and windows2022.
   * The version can either be pinned to a specific AMI release, with that AMIs version format (ex: "al2023@v20240625" or "bottlerocket@v1.10.0").
   * The version can also be set to "latest" for any family. Setting the version to latest will result in drift when a new AMI is released. This is **not** recommended for production environments.
   * Note: The Windows families do **not** support version pinning, and only latest may be used.
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#alias
   */
  readonly alias?: string;

  /**
   * ID is the ami id in EC2
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#id
   */
  readonly id?: string;

  /**
   * Name is the ami name in EC2.
   * This value is the name field, which is different from the name tag.
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#name
   */
  readonly name?: string;

  /**
   * Owner is the owner for the ami.
   * You can specify a combination of AWS account IDs, "self", "amazon", and "aws-marketplace"
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#owner
   */
  readonly owner?: string;

  /**
   * SSMParameter is the name (or ARN) of the SSM parameter containing the Image ID.
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#ssmParameter
   */
  readonly ssmParameter?: string;

  /**
   * Tags is a map of key/value tags used to select amis.
   * Specifying '*' for a value selects all values for a given tag key.
   *
   * @schema Ec2NodeClassSpecAmiSelectorTerms#tags
   */
  readonly tags?: { [key: string]: string };
}

/**
 * Converts an object of type 'Ec2NodeClassSpecAmiSelectorTerms' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecAmiSelectorTerms(
  obj: Ec2NodeClassSpecAmiSelectorTerms | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    alias: obj.alias,
    id: obj.id,
    name: obj.name,
    owner: obj.owner,
    ssmParameter: obj.ssmParameter,
    tags:
      obj.tags === undefined
        ? undefined
        : Object.entries(obj.tags).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * @schema Ec2NodeClassSpecBlockDeviceMappings
 */
export interface Ec2NodeClassSpecBlockDeviceMappings {
  /**
   * The device name (for example, /dev/sdh or xvdh).
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappings#deviceName
   */
  readonly deviceName?: string;

  /**
   * EBS contains parameters used to automatically set up EBS volumes when an instance is launched.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappings#ebs
   */
  readonly ebs?: Ec2NodeClassSpecBlockDeviceMappingsEbs;

  /**
   * RootVolume is a flag indicating if this device is mounted as kubelet root dir. You can
   * configure at most one root volume in BlockDeviceMappings.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappings#rootVolume
   */
  readonly rootVolume?: boolean;
}

/**
 * Converts an object of type 'Ec2NodeClassSpecBlockDeviceMappings' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecBlockDeviceMappings(
  obj: Ec2NodeClassSpecBlockDeviceMappings | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    deviceName: obj.deviceName,
    ebs: toJson_Ec2NodeClassSpecBlockDeviceMappingsEbs(obj.ebs),
    rootVolume: obj.rootVolume,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * @schema Ec2NodeClassSpecCapacityReservationSelectorTerms
 */
export interface Ec2NodeClassSpecCapacityReservationSelectorTerms {
  /**
   * ID is the capacity reservation id in EC2
   *
   * @schema Ec2NodeClassSpecCapacityReservationSelectorTerms#id
   */
  readonly id?: string;

  /**
   * Owner is the owner id for the ami.
   *
   * @schema Ec2NodeClassSpecCapacityReservationSelectorTerms#ownerID
   */
  readonly ownerId?: string;

  /**
   * Tags is a map of key/value tags used to select capacity reservations.
   * Specifying '*' for a value selects all values for a given tag key.
   *
   * @schema Ec2NodeClassSpecCapacityReservationSelectorTerms#tags
   */
  readonly tags?: { [key: string]: string };
}

/**
 * Converts an object of type 'Ec2NodeClassSpecCapacityReservationSelectorTerms' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecCapacityReservationSelectorTerms(
  obj: Ec2NodeClassSpecCapacityReservationSelectorTerms | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    id: obj.id,
    ownerID: obj.ownerId,
    tags:
      obj.tags === undefined
        ? undefined
        : Object.entries(obj.tags).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * InstanceStorePolicy specifies how to handle instance-store disks.
 *
 * @schema Ec2NodeClassSpecInstanceStorePolicy
 */
export enum Ec2NodeClassSpecInstanceStorePolicy {
  /** RAID0 */
  RAID0 = 'RAID0',
}

/**
 * Kubelet defines args to be used when configuring kubelet on provisioned nodes.
 * They are a subset of the upstream types, recognizing not all options may be supported.
 * Wherever possible, the types and names should reflect the upstream kubelet types.
 *
 * @schema Ec2NodeClassSpecKubelet
 */
export interface Ec2NodeClassSpecKubelet {
  /**
   * clusterDNS is a list of IP addresses for the cluster DNS server.
   * Note that not all providers may use all addresses.
   *
   * @schema Ec2NodeClassSpecKubelet#clusterDNS
   */
  readonly clusterDns?: string[];

  /**
   * CPUCFSQuota enables CPU CFS quota enforcement for containers that specify CPU limits.
   *
   * @schema Ec2NodeClassSpecKubelet#cpuCFSQuota
   */
  readonly cpuCfsQuota?: boolean;

  /**
   * EvictionHard is the map of signal names to quantities that define hard eviction thresholds
   *
   * @schema Ec2NodeClassSpecKubelet#evictionHard
   */
  readonly evictionHard?: { [key: string]: string };

  /**
   * EvictionMaxPodGracePeriod is the maximum allowed grace period (in seconds) to use when terminating pods in
   * response to soft eviction thresholds being met.
   *
   * @schema Ec2NodeClassSpecKubelet#evictionMaxPodGracePeriod
   */
  readonly evictionMaxPodGracePeriod?: number;

  /**
   * EvictionSoft is the map of signal names to quantities that define soft eviction thresholds
   *
   * @schema Ec2NodeClassSpecKubelet#evictionSoft
   */
  readonly evictionSoft?: { [key: string]: string };

  /**
   * EvictionSoftGracePeriod is the map of signal names to quantities that define grace periods for each eviction signal
   *
   * @schema Ec2NodeClassSpecKubelet#evictionSoftGracePeriod
   */
  readonly evictionSoftGracePeriod?: { [key: string]: string };

  /**
   * ImageGCHighThresholdPercent is the percent of disk usage after which image
   * garbage collection is always run. The percent is calculated by dividing this
   * field value by 100, so this field must be between 0 and 100, inclusive.
   * When specified, the value must be greater than ImageGCLowThresholdPercent.
   *
   * @schema Ec2NodeClassSpecKubelet#imageGCHighThresholdPercent
   */
  readonly imageGcHighThresholdPercent?: number;

  /**
   * ImageGCLowThresholdPercent is the percent of disk usage before which image
   * garbage collection is never run. Lowest disk usage to garbage collect to.
   * The percent is calculated by dividing this field value by 100,
   * so the field value must be between 0 and 100, inclusive.
   * When specified, the value must be less than imageGCHighThresholdPercent
   *
   * @schema Ec2NodeClassSpecKubelet#imageGCLowThresholdPercent
   */
  readonly imageGcLowThresholdPercent?: number;

  /**
   * KubeReserved contains resources reserved for Kubernetes system components.
   *
   * @schema Ec2NodeClassSpecKubelet#kubeReserved
   */
  readonly kubeReserved?: { [key: string]: string };

  /**
   * MaxPods is an override for the maximum number of pods that can run on
   * a worker node instance.
   *
   * @schema Ec2NodeClassSpecKubelet#maxPods
   */
  readonly maxPods?: number;

  /**
   * PodsPerCore is an override for the number of pods that can run on a worker node
   * instance based on the number of cpu cores. This value cannot exceed MaxPods, so, if
   * MaxPods is a lower value, that value will be used.
   *
   * @schema Ec2NodeClassSpecKubelet#podsPerCore
   */
  readonly podsPerCore?: number;

  /**
   * SystemReserved contains resources reserved for OS system daemons and kernel memory.
   *
   * @schema Ec2NodeClassSpecKubelet#systemReserved
   */
  readonly systemReserved?: { [key: string]: string };
}

/**
 * Converts an object of type 'Ec2NodeClassSpecKubelet' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecKubelet(
  obj: Ec2NodeClassSpecKubelet | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    clusterDNS: obj.clusterDns?.map((y) => y),
    cpuCFSQuota: obj.cpuCfsQuota,
    evictionHard:
      obj.evictionHard === undefined
        ? undefined
        : Object.entries(obj.evictionHard).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
    evictionMaxPodGracePeriod: obj.evictionMaxPodGracePeriod,
    evictionSoft:
      obj.evictionSoft === undefined
        ? undefined
        : Object.entries(obj.evictionSoft).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
    evictionSoftGracePeriod:
      obj.evictionSoftGracePeriod === undefined
        ? undefined
        : Object.entries(obj.evictionSoftGracePeriod).reduce(
            (r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }),
            {},
          ),
    imageGCHighThresholdPercent: obj.imageGcHighThresholdPercent,
    imageGCLowThresholdPercent: obj.imageGcLowThresholdPercent,
    kubeReserved:
      obj.kubeReserved === undefined
        ? undefined
        : Object.entries(obj.kubeReserved).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
    maxPods: obj.maxPods,
    podsPerCore: obj.podsPerCore,
    systemReserved:
      obj.systemReserved === undefined
        ? undefined
        : Object.entries(obj.systemReserved).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * MetadataOptions for the generated launch template of provisioned nodes.
 *
 * This specifies the exposure of the Instance Metadata Service to
 * provisioned EC2 nodes. For more information,
 * see Instance Metadata and User Data
 * (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
 * in the Amazon Elastic Compute Cloud User Guide.
 *
 * Refer to recommended, security best practices
 * (https://aws.github.io/aws-eks-best-practices/security/docs/iam/#restrict-access-to-the-instance-profile-assigned-to-the-worker-node)
 * for limiting exposure of Instance Metadata and User Data to pods.
 * If omitted, defaults to httpEndpoint enabled, with httpProtocolIPv6
 * disabled, with httpPutResponseLimit of 1, and with httpTokens
 * required.
 *
 * @schema Ec2NodeClassSpecMetadataOptions
 */
export interface Ec2NodeClassSpecMetadataOptions {
  /**
   * HTTPEndpoint enables or disables the HTTP metadata endpoint on provisioned
   * nodes. If metadata options is non-nil, but this parameter is not specified,
   * the default state is "enabled".
   *
   * If you specify a value of "disabled", instance metadata will not be accessible
   * on the node.
   *
   * @schema Ec2NodeClassSpecMetadataOptions#httpEndpoint
   */
  readonly httpEndpoint?: Ec2NodeClassSpecMetadataOptionsHttpEndpoint;

  /**
   * HTTPProtocolIPv6 enables or disables the IPv6 endpoint for the instance metadata
   * service on provisioned nodes. If metadata options is non-nil, but this parameter
   * is not specified, the default state is "disabled".
   *
   * @schema Ec2NodeClassSpecMetadataOptions#httpProtocolIPv6
   */
  readonly httpProtocolIPv6?: Ec2NodeClassSpecMetadataOptionsHttpProtocolIPv6;

  /**
   * HTTPPutResponseHopLimit is the desired HTTP PUT response hop limit for
   * instance metadata requests. The larger the number, the further instance
   * metadata requests can travel. Possible values are integers from 1 to 64.
   * If metadata options is non-nil, but this parameter is not specified, the
   * default value is 1.
   *
   * @schema Ec2NodeClassSpecMetadataOptions#httpPutResponseHopLimit
   */
  readonly httpPutResponseHopLimit?: number;

  /**
   * HTTPTokens determines the state of token usage for instance metadata
   * requests. If metadata options is non-nil, but this parameter is not
   * specified, the default state is "required".
   *
   * If the state is optional, one can choose to retrieve instance metadata with
   * or without a signed token header on the request. If one retrieves the IAM
   * role credentials without a token, the version 1.0 role credentials are
   * returned. If one retrieves the IAM role credentials using a valid signed
   * token, the version 2.0 role credentials are returned.
   *
   * If the state is "required", one must send a signed token header with any
   * instance metadata retrieval requests. In this state, retrieving the IAM
   * role credentials always returns the version 2.0 credentials; the version
   * 1.0 credentials are not available.
   *
   * @schema Ec2NodeClassSpecMetadataOptions#httpTokens
   */
  readonly httpTokens?: Ec2NodeClassSpecMetadataOptionsHttpTokens;
}

/**
 * Converts an object of type 'Ec2NodeClassSpecMetadataOptions' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecMetadataOptions(
  obj: Ec2NodeClassSpecMetadataOptions | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    httpEndpoint: obj.httpEndpoint,
    httpProtocolIPv6: obj.httpProtocolIPv6,
    httpPutResponseHopLimit: obj.httpPutResponseHopLimit,
    httpTokens: obj.httpTokens,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * SecurityGroupSelectorTerm defines selection logic for a security group used by Karpenter to launch nodes.
 * If multiple fields are used for selection, the requirements are ANDed.
 *
 * @schema Ec2NodeClassSpecSecurityGroupSelectorTerms
 */
export interface Ec2NodeClassSpecSecurityGroupSelectorTerms {
  /**
   * ID is the security group id in EC2
   *
   * @schema Ec2NodeClassSpecSecurityGroupSelectorTerms#id
   */
  readonly id?: string;

  /**
   * Name is the security group name in EC2.
   * This value is the name field, which is different from the name tag.
   *
   * @schema Ec2NodeClassSpecSecurityGroupSelectorTerms#name
   */
  readonly name?: string;

  /**
   * Tags is a map of key/value tags used to select security groups.
   * Specifying '*' for a value selects all values for a given tag key.
   *
   * @schema Ec2NodeClassSpecSecurityGroupSelectorTerms#tags
   */
  readonly tags?: { [key: string]: string };
}

/**
 * Converts an object of type 'Ec2NodeClassSpecSecurityGroupSelectorTerms' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecSecurityGroupSelectorTerms(
  obj: Ec2NodeClassSpecSecurityGroupSelectorTerms | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    id: obj.id,
    name: obj.name,
    tags:
      obj.tags === undefined
        ? undefined
        : Object.entries(obj.tags).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * SubnetSelectorTerm defines selection logic for a subnet used by Karpenter to launch nodes.
 * If multiple fields are used for selection, the requirements are ANDed.
 *
 * @schema Ec2NodeClassSpecSubnetSelectorTerms
 */
export interface Ec2NodeClassSpecSubnetSelectorTerms {
  /**
   * ID is the subnet id in EC2
   *
   * @schema Ec2NodeClassSpecSubnetSelectorTerms#id
   */
  readonly id?: string;

  /**
   * Tags is a map of key/value tags used to select subnets
   * Specifying '*' for a value selects all values for a given tag key.
   *
   * @schema Ec2NodeClassSpecSubnetSelectorTerms#tags
   */
  readonly tags?: { [key: string]: string };
}

/**
 * Converts an object of type 'Ec2NodeClassSpecSubnetSelectorTerms' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecSubnetSelectorTerms(
  obj: Ec2NodeClassSpecSubnetSelectorTerms | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    id: obj.id,
    tags:
      obj.tags === undefined
        ? undefined
        : Object.entries(obj.tags).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {}),
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * EBS contains parameters used to automatically set up EBS volumes when an instance is launched.
 *
 * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs
 */
export interface Ec2NodeClassSpecBlockDeviceMappingsEbs {
  /**
   * DeleteOnTermination indicates whether the EBS volume is deleted on instance termination.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#deleteOnTermination
   */
  readonly deleteOnTermination?: boolean;

  /**
   * Encrypted indicates whether the EBS volume is encrypted. Encrypted volumes can only
   * be attached to instances that support Amazon EBS encryption. If you are creating
   * a volume from a snapshot, you can't specify an encryption value.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#encrypted
   */
  readonly encrypted?: boolean;

  /**
   * IOPS is the number of I/O operations per second (IOPS). For gp3, io1, and io2 volumes,
   * this represents the number of IOPS that are provisioned for the volume. For
   * gp2 volumes, this represents the baseline performance of the volume and the
   * rate at which the volume accumulates I/O credits for bursting.
   *
   * The following are the supported values for each volume type:
   *
   * * gp3: 3,000-16,000 IOPS
   *
   * * io1: 100-64,000 IOPS
   *
   * * io2: 100-64,000 IOPS
   *
   * For io1 and io2 volumes, we guarantee 64,000 IOPS only for Instances built
   * on the Nitro System (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html#ec2-nitro-instances).
   * Other instance families guarantee performance up to 32,000 IOPS.
   *
   * This parameter is supported for io1, io2, and gp3 volumes only. This parameter
   * is not supported for gp2, st1, sc1, or standard volumes.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#iops
   */
  readonly iops?: number;

  /**
   * Identifier (key ID, key alias, key ARN, or alias ARN) of the customer managed KMS key to use for EBS encryption.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#kmsKeyID
   */
  readonly kmsKeyId?: string;

  /**
   * SnapshotID is the ID of an EBS snapshot
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#snapshotID
   */
  readonly snapshotId?: string;

  /**
   * Throughput to provision for a gp3 volume, with a maximum of 1,000 MiB/s.
   * Valid Range: Minimum value of 125. Maximum value of 1000.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#throughput
   */
  readonly throughput?: number;

  /**
   * VolumeInitializationRate specifies the Amazon EBS Provisioned Rate for Volume Initialization,
   * in MiB/s, at which to download the snapshot blocks from Amazon S3 to the volume. This is also known as volume
   * initialization. Specifying a volume initialization rate ensures that the volume is initialized at a
   * predictable and consistent rate after creation. Only allowed if SnapshotID is set.
   * Valid Range: Minimum value of 100. Maximum value of 300.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#volumeInitializationRate
   */
  readonly volumeInitializationRate?: number;

  /**
   * VolumeSize in `Gi`, `G`, `Ti`, or `T`. You must specify either a snapshot ID or
   * a volume size. The following are the supported volumes sizes for each volume
   * type:
   *
   * * gp2 and gp3: 1-16,384
   *
   * * io1 and io2: 4-16,384
   *
   * * st1 and sc1: 125-16,384
   *
   * * standard: 1-1,024
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#volumeSize
   */
  readonly volumeSize?: string;

  /**
   * VolumeType of the block device.
   * For more information, see Amazon EBS volume types (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSVolumeTypes.html)
   * in the Amazon Elastic Compute Cloud User Guide.
   *
   * @schema Ec2NodeClassSpecBlockDeviceMappingsEbs#volumeType
   */
  readonly volumeType?: Ec2NodeClassSpecBlockDeviceMappingsEbsVolumeType;
}

/**
 * Converts an object of type 'Ec2NodeClassSpecBlockDeviceMappingsEbs' to JSON representation.
 */
export function toJson_Ec2NodeClassSpecBlockDeviceMappingsEbs(
  obj: Ec2NodeClassSpecBlockDeviceMappingsEbs | undefined,
): Record<string, any> | undefined {
  if (obj === undefined) {
    return undefined;
  }
  const result = {
    deleteOnTermination: obj.deleteOnTermination,
    encrypted: obj.encrypted,
    iops: obj.iops,
    kmsKeyID: obj.kmsKeyId,
    snapshotID: obj.snapshotId,
    throughput: obj.throughput,
    volumeInitializationRate: obj.volumeInitializationRate,
    volumeSize: obj.volumeSize,
    volumeType: obj.volumeType,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined ? r : { ...r, [i[0]]: i[1] }), {});
}

/**
 * HTTPEndpoint enables or disables the HTTP metadata endpoint on provisioned
 * nodes. If metadata options is non-nil, but this parameter is not specified,
 * the default state is "enabled".
 *
 * If you specify a value of "disabled", instance metadata will not be accessible
 * on the node.
 *
 * @schema Ec2NodeClassSpecMetadataOptionsHttpEndpoint
 */
export enum Ec2NodeClassSpecMetadataOptionsHttpEndpoint {
  /** enabled */
  ENABLED = 'enabled',
  /** disabled */
  DISABLED = 'disabled',
}

/**
 * HTTPProtocolIPv6 enables or disables the IPv6 endpoint for the instance metadata
 * service on provisioned nodes. If metadata options is non-nil, but this parameter
 * is not specified, the default state is "disabled".
 *
 * @schema Ec2NodeClassSpecMetadataOptionsHttpProtocolIPv6
 */
export enum Ec2NodeClassSpecMetadataOptionsHttpProtocolIPv6 {
  /** enabled */
  ENABLED = 'enabled',
  /** disabled */
  DISABLED = 'disabled',
}

/**
 * HTTPTokens determines the state of token usage for instance metadata
 * requests. If metadata options is non-nil, but this parameter is not
 * specified, the default state is "required".
 *
 * If the state is optional, one can choose to retrieve instance metadata with
 * or without a signed token header on the request. If one retrieves the IAM
 * role credentials without a token, the version 1.0 role credentials are
 * returned. If one retrieves the IAM role credentials using a valid signed
 * token, the version 2.0 role credentials are returned.
 *
 * If the state is "required", one must send a signed token header with any
 * instance metadata retrieval requests. In this state, retrieving the IAM
 * role credentials always returns the version 2.0 credentials; the version
 * 1.0 credentials are not available.
 *
 * @schema Ec2NodeClassSpecMetadataOptionsHttpTokens
 */
export enum Ec2NodeClassSpecMetadataOptionsHttpTokens {
  /** required */
  REQUIRED = 'required',
  /** optional */
  OPTIONAL = 'optional',
}

/**
 * VolumeType of the block device.
 * For more information, see Amazon EBS volume types (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSVolumeTypes.html)
 * in the Amazon Elastic Compute Cloud User Guide.
 *
 * @schema Ec2NodeClassSpecBlockDeviceMappingsEbsVolumeType
 */
export enum Ec2NodeClassSpecBlockDeviceMappingsEbsVolumeType {
  /** standard */
  STANDARD = 'standard',
  /** io1 */
  IO1 = 'io1',
  /** io2 */
  IO2 = 'io2',
  /** gp2 */
  GP2 = 'gp2',
  /** sc1 */
  SC1 = 'sc1',
  /** st1 */
  ST1 = 'st1',
  /** gp3 */
  GP3 = 'gp3',
}
