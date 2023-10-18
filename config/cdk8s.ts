import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';

const app = new App();

async function main(): Promise<void> {
  new ArgoSemaphore(app, 'semaphore', {});

  app.synth();
}

main();
