import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import YAML from 'yaml';

const root = join(import.meta.dirname, '../..');

const TaskReference = /tasks(?:\.|\[["'])([\w-]+)(?:["']\])?\.(?:outputs|status|exitCode|ip|id)\b/g;

interface DagTask {
  name: string;
  depends?: string;
  dependencies?: string[];
  arguments?: unknown;
  when?: string;
  withParam?: string;
  withItems?: unknown;
}

interface Template {
  name: string;
  dag?: { tasks?: DagTask[] };
}

interface Manifest {
  spec?: { templates?: Template[]; workflowSpec?: { templates?: Template[] } };
}

function yamlFiles(...dirs: string[]): string[] {
  return dirs.flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.ya?ml$/.test(file))
      .map((file) => join(dir, file)),
  );
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

/** References to tasks outside a task's dependencies, as `path template/task -> referenced` */
function outsideDependencies(path: string): string[] {
  const found: string[] = [];
  for (const doc of YAML.parseAllDocuments(readFileSync(join(root, path), 'utf8'))) {
    const spec = (doc.toJS() as Manifest | null)?.spec;
    for (const template of spec?.templates ?? spec?.workflowSpec?.templates ?? []) {
      const tasks = template.dag?.tasks ?? [];
      const names = new Set(tasks.map((task) => task.name));
      const parents = new Map(
        tasks.map((task) => {
          const depends = task.depends ?? task.dependencies?.join(' ') ?? '';
          return [task.name, (depends.match(/[\w-]+/g) ?? []).filter((name) => names.has(name))];
        }),
      );
      for (const task of tasks) {
        const ancestors = new Set<string>();
        const queue = [...(parents.get(task.name) ?? [])];
        for (let name = queue.pop(); name != null; name = queue.pop()) {
          if (ancestors.has(name)) continue;
          ancestors.add(name);
          queue.push(...(parents.get(name) ?? []));
        }
        const fields = strings([task.arguments, task.when, task.withParam, task.withItems]);
        const referenced = new Set(
          fields.flatMap((field) => [...field.matchAll(TaskReference)].map((m) => m[1] ?? '')),
        );
        for (const name of referenced) {
          if (names.has(name) && !ancestors.has(name)) found.push(`${path} ${template.name}/${task.name} -> ${name}`);
        }
      }
    }
  }
  return found;
}

describe('DAG tasks', () => {
  it('should only reference tasks they depend on', () => {
    assert.deepEqual(yamlFiles('templates', 'workflows').flatMap(outsideDependencies), []);
  });
});
