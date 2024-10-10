import fs from 'node:fs';

import YAML from 'yaml';

/**
 * Workflow template type (partial)
 */
type WorkflowTemplate = { spec: { templates: { name: string; script: { source: string } }[] } };

/**
 * List of required modules
 */
export const shimRequired: string[] = [];

/**
 * Return the required module to import.
 *
 * @param name of the required module
 * @returns
 */
function requireShim(name: string): unknown {
  shimRequired.push(name);
  if (name === 'node:fs') return fs;
  throw new Error('Unknown import: ' + name);
}

/**
 * Extract the script of the task named `taskName` from the `workflowTemplate`.
 *
 * @param workflow Workflow template
 * @param taskName the task to extract the script from
 * @returns the script of the task
 */
function getScript(workflow: WorkflowTemplate, taskName: string): string {
  const template = workflow?.spec?.templates?.find((f) => f.name === taskName);
  if (template == null) throw new Error(`Task ${taskName} not found in the workflow`);

  const source = template.script?.source;
  if (source == null) throw new Error(`Task ${taskName} has no script`);

  return source;
}

/**
 * Data to replace in the script
 */
type FunctionData = { toReplace: string; replaceWith: string };

/**
 * Read the workflow YAML file and create a function from the script inside.
 * Replace the data in the script and run the function.
 *
 * @param workflowPath path to the workflow YAML file
 * @param data data to replace in the script
 * @param requireModule required module to import (optional)
 */
export function runTestFunction(workflowPath: string, data: FunctionData[], requireModule?: string): void {
  const wfRaw = fs.readFileSync(workflowPath, 'utf-8');
  const wfTemplate = YAML.parse(wfRaw) as WorkflowTemplate;
  let script = getScript(wfTemplate, 'main');

  data.forEach((d) => {
    script = script.replaceAll(d.toReplace, d.replaceWith);
  });

  if (requireModule !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('require', script)(requireShim);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(script)();
  }
}
