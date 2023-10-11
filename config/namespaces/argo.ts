import { App } from 'cdk8s';
import { NamespaceChart } from '../charts/namespace.js';
import { FluentBit } from '../charts/fluent-bit.js';

const app = new App();

async function main(): Promise<void> {
  const ns = new NamespaceChart(app, 'namespace', { namespace: 'argo' });

    const fluentBit = new FluentBit(app, 'fluentBit', {});
  fluentBit.addDependency(ns);
  app.synth();
}

main();