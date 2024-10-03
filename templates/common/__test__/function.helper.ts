import fs from 'node:fs';

/**
 * Extract the script from a workflow template file located as its `source`.
 *
 * @param path to the workflow template file
 * @param stopDelimiter optional delimiter to stop the extraction
 * @returns the script as a string
 */
function getFunctionFromScript(path: string, stopDelimiter?: string): string {
  let func = fs.readFileSync(path, 'utf-8').split('source: |')[1];
  if (stopDelimiter) {
    func = func?.split(stopDelimiter)[0];
  }
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
 * @param stopDelimiter optional delimiter to stop the extraction of the script
 */
export function runTestFunction(workflowPath: string, data: FunctionData[], stopDelimiter?: string): void {
  let func = getFunctionFromScript(workflowPath, stopDelimiter);
  data.forEach((d) => {
    func = func.replace(d.toReplace, d.replaceWith);
  });
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(func)();
}
