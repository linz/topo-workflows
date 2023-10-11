import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';

const app = new App();

async function main(): Promise<void> {
  //   const ns = new NamespaceChart(app, 'namespace', { namespace: 'argo' });

  // FIXME: metadata name is not correct, like 'semaphore-semaphores-c8f222a7'
  new ArgoSemaphore(app, 'semaphore', {});

  app.synth();
}

main();
