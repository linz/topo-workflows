import { App } from 'cdk8s';

import { ArgoSemaphore } from './charts/argo.semaphores';
import { FluentBit } from './charts/fluentbit';

const app = new App();

async function main(): Promise<void> {
  new ArgoSemaphore(app, 'semaphore', {});
  new FluentBit(app, 'fluentbit', {});

  app.synth();
}

main();
