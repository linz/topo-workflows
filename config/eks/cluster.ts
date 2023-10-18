import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface EksClusterProps extends StackProps {}

export class LinzEksCluster extends Stack {
  constructor(scope: Construct, id: string, props: EksClusterProps) {
    super(scope, id, props);
  }
}
