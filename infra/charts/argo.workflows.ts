import { Chart, ChartProps, Duration, Helm } from 'cdk8s';
import { Construct } from 'constructs';

import { applyDefaultLabels } from '../util/labels.js';

export interface ArgoWorkflowsProps {
  tempBucketName: string;
  saName: string;
  clusterName: string;
}

const argoWorkflowsChartVersion = '0.34.0';

export class ArgoWorkflows extends Chart {
  constructor(scope: Construct, id: string, props: ArgoWorkflowsProps & ChartProps) {
    super(scope, id, applyDefaultLabels(props, 'argo-workflows', argoWorkflowsChartVersion, 'logs', 'workflows'));

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

    const DefaultNodeSelector = {
      'eks.amazonaws.com/capacityType': 'ON_DEMAND',
      'kubernetes.io/arch': 'amd64',
    };

    new Helm(this, 'argo-workflows', {
      chart: 'argo-workflows',
      releaseName: 'argo-workflows',
      repo: 'https://argoproj.github.io/argo-helm',
      namespace: 'argo',
      version: argoWorkflowsChartVersion,
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
