import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname, '../..');
const githubWorkflows = ['.github/workflows/main.yml', '.github/workflows/publish.yml'];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function appVersion(chart: string): string {
  const version = /^const appVersion = '(.*)';$/m.exec(read(chart))?.[1];
  assert.ok(version, `appVersion not found in ${chart}`);
  return version;
}

function yamlFiles(...dirs: string[]): string[] {
  return dirs.flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.ya?ml$/.test(file))
      .map((file) => join(dir, file)),
  );
}

/** Files without a version or referencing one other than `expected`, as `path: version` */
function mismatches(paths: string[], pattern: RegExp, expected: string): string[] {
  return paths.flatMap((path) => {
    const versions = [...read(path).matchAll(pattern)].map((m) => m[1]);
    if (versions.length === 0) return [`${path}: no version`];
    return versions.filter((v) => v !== expected).map((v) => `${path}: ${v}`);
  });
}

describe('Argo Workflows version', () => {
  const version = appVersion('infra/charts/argo.workflows.ts');

  it('should match ARGO_URL in GitHub workflows', () => {
    assert.deepEqual(mismatches(githubWorkflows, /argo-workflows\/releases\/download\/(v\d[^/]*)\//g, version), []);
  });

  it('should use the same ARGO_SHA256 in GitHub workflows', () => {
    const [main, publish] = githubWorkflows.map((path) => /^ *ARGO_SHA256: ([0-9a-f]{64})$/m.exec(read(path))?.[1]);
    assert.ok(main, `ARGO_SHA256 not found in ${githubWorkflows[0]}`);
    assert.equal(publish, main);
  });

  it('should match the schema of templates and workflows', () => {
    const files = yamlFiles('templates', 'workflows');
    assert.deepEqual(mismatches(files, /argoproj\/argo-workflows\/(v\d[^/]*)\/api\/jsonschema/g, version), []);
  });
});

describe('Argo Events version', () => {
  const version = appVersion('infra/charts/argo.events.ts');

  it('should match the CRD imports in cdk8s.yaml', () => {
    assert.deepEqual(mismatches(['cdk8s.yaml'], /argo-events\/refs\/tags\/(v\d[^/]*)\//g, version), []);
  });

  it('should match the schema of events', () => {
    assert.deepEqual(
      mismatches(yamlFiles('events'), /argoproj\/argo-events\/(v\d[^/]*)\/api\/jsonschema/g, version),
      [],
    );
  });
});
