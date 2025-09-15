import { Chart, ChartProps } from 'cdk8s';
import * as k8s from 'cdk8s-plus-32';
import { Construct } from 'constructs';

export class ArgoSecretsChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: { accountIdHydro: string; accountIdTopo: string; s3BatchRestoreRoleArn: string } & ChartProps,
  ) {
    super(scope, id);

    new k8s.Secret(this, 'S3BatchRestoreSecrets', {
      metadata: {
        name: 's3-batch-restore-secrets',
        namespace: 'argo',
      },
      stringData: {
        ACCOUNT_ID_HYDRO: props.accountIdHydro,
        ACCOUNT_ID_TOPO: props.accountIdTopo,
        ROLE_ARN: props.s3BatchRestoreRoleArn,
      },
    });
  }
}
