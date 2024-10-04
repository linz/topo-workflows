import fs from 'node:fs';

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
 * Extract the script from a workflow template file located as its `source`.
 *
 * @param path to the workflow template file
 * @returns the script as a string
 */
function getFunctionFromScript(path: string): string {
  const func = fs.readFileSync(path, 'utf-8').split('source: |')[1];
  if (!func) {
    throw new Error('No script found in the workflow');
  }
  return func;
}

/**
 * Data to replace in the script
 */
type FunctionData = { toReplace: string; replaceWith: string };

/**
 * Create and run a function from a script located in a workflowTemplate file.
 *
 * @param workflowPath path to the workflow template file
 * @param data data to replace in the script
 * @param requireModule a module required by the script
 */
export function runTestFunction(workflowPath: string, data: FunctionData[], requireModule?: string): void {
  let func = getFunctionFromScript(workflowPath);
  data.forEach((d) => {
    func = func.replaceAll(d.toReplace, d.replaceWith);
  });
  if (requireModule !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('require', func)(requireShim);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(func)();
  }
}
