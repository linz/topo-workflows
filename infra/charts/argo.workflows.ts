import { Chart, ChartProps, Duration, Helm } from 'cdk8s';
import { Secret } from 'cdk8s-plus-27';
import { Construct } from 'constructs';

import { ArgoDbUser, CfnOutputKeys, ClusterName, validateKeys } from '../constants.js';
import { getCfnOutputs } from '../util/cloud.formation.js';
import { applyDefaultLabels } from '../util/labels.js';

export interface ArgoWorkflowsProps {
  /**
   * Name of the temporary bucket used to store artifacts
   *
   * @example "linz-workflows-scratch"
   */
  tempBucketName: string;
  /**
   * Name of the Service Account used to run workflows
   *
   * @example "workflow-runner-sa"
   */
  saName: string;
  /**
   * Name of the EKS cluster
   *
   * @example "Workflows"
   */
  clusterName: string;
  /**
   * The Argo database endpoint
   *
   * @example "argodb-argodb4be14fa2-p8yjinijwbro.cmpyjhgv78aj.ap-southeast-2.rds.amazonaws.com"
   */
  argoDbEndpoint: string;
  argoDbPassword: string;
}

/**
 * This is the version of the Helm chart for Argo Workflows https://github.com/argoproj/argo-helm/blob/25d7b519bc7fc37d2820721cd648f3a3403d0e38/charts/argo-workflows/Chart.yaml#L6
 *
 * (Do not mix up with Argo Workflows application version)
 */
const chartVersion = '0.34.0';

/**
 * This is the version of Argo Workflows for the `chartVersion` we're using
 * https://github.com/argoproj/argo-helm/blob/2730dc24c7ad69b98d3206705a5ebf5cb34dd96b/charts/argo-workflows/Chart.yaml#L2
 *
 */
const appVersion = 'v3.4.11';

const cfnOutputs = await getCfnOutputs(ClusterName);
validateKeys(cfnOutputs);

export class ArgoWorkflows extends Chart {
  constructor(scope: Construct, id: string, props: ArgoWorkflowsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-workflows', appVersion, 'logs', 'workflows'));

    const artifactRepository = {
      archiveLogs: true,
      useStaticCredentials: false,
      s3: {
        accessKeySecret: { key: 'accesskey', name: '' },
        secretKeySecret: { key: 'secretkey', name: '' },
        bucket: props.tempBucketName,
        keyFormat:
          '{{workflow.creationTimestamp.Y}}-{{workflow.creationTimestamp.m}}/{{workflow.creationTimestamp.d}}-{{workflow.name}}/{{pod.name}}',
        region: 'ap-southeast-2',
        endpoint: 's3.amazonaws.com',
        useSDKCreds: true,
        insecure: false,
      },
    };

    const argoDb = new Secret(this, 'argo-postgres-config', {});
    argoDb.addStringData('username', ArgoDbUser);
    argoDb.addStringData('password', props.argoDbPassword);

    const persistence = {
      connectionPool: {
        maxIdleConns: 100,
        maxOpenConns: 0,
      },
      nodeStatusOffLoad: false,
      archive: true,
      archiveTTL: '180d',
      postgresql: {
        host: cfnOutputs[CfnOutputKeys.ArgoDbEndpoint],
        port: 5432,
        database: 'argo',
        tableName: 'argo_workflows',
        // TODO: decide on method to add DB secret to K8s from AWS Secrets Manager
        userNameSecret: { name: argoDb.name, key: 'username' },
        passwordSecret: { name: argoDb.name, key: 'password' },
        ssl: true,
        sslMode: 'require',
      },
    };

    const DefaultNodeSelector = {
      'eks.amazonaws.com/capacityType': 'ON_DEMAND',
      'kubernetes.io/arch': 'amd64',
    };

    new Helm(this, 'argo-workflows', {
      chart: 'argo-workflows',
      releaseName: 'argo-workflows',
      repo: 'https://argoproj.github.io/argo-helm',
      namespace: 'argo',
      version: chartVersion,
      values: {
        server: {
          replicas: 2,
          extraEnv: [
            /** Disable the "first time" popups that pop up every time  */
            { name: 'FIRST_TIME_USER_MODAL', value: 'false' },
            { name: 'FEEDBACK_MODAL', value: 'false' },
            { name: 'NEW_VERSION_MODAL', value: 'false' },
          ],
          nodeSelector: { ...DefaultNodeSelector },
          extraArgs: ['--auth-mode=server'],
        },
        artifactRepository,
        controller: {
          nodeSelector: { ...DefaultNodeSelector },
          workflowNamespaces: ['argo'],
          extraArgs: [],
          persistence,
          replicas: 2,
          workflowDefaults: {
            spec: {
              serviceAccountName: props.saName,
              ttlStrategy: { secondsAfterCompletion: Duration.days(7).toSeconds() },
              podGC: { strategy: 'OnPodCompletion' },
              tolerations: [
                {
                  key: 'karpenter.sh/capacity-type',
                  operator: 'Equal',
                  value: 'spot',
                  effect: 'NoSchedule',
                },
              ],
              parallelism: 3,
            },
          },
        },
        workflow: {
          rbac: { create: true },
          serviceAccount: { create: false, name: props.saName },
        },
      },
    });
  }
}
