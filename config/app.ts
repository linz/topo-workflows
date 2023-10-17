import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores.js';

const app = new App();

async function main(): Promise<void> {
  new ArgoSemaphore(app, 'semaphore', {});

  //const clusterStackName = 'EksWorkflowProd';
  //const clusterStack = await getStackFromName(clusterStackName);

  //console.log(clusterStack.RoleARN);

  //app.synth();
}

main();
