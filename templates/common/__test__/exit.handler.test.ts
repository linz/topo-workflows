import assert from 'node:assert';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import YAML from 'yaml';

/**
 * Workflow template type (partial)
 */
type WorkflowTemplate = { spec: { templates: { name: string; script: { source: string } }[] } };

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
 * Read the workflow YAML file and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 *
 * @param ctx
 */
function runTestFunction(ctx: { workflowParameters: string; workflowStatus: string }): void {
  const wfRaw = fs.readFileSync('./templates/common/exit.handler.yml', 'utf-8');
  const wfTemplate = YAML.parse(wfRaw) as WorkflowTemplate;
  const script = getScript(wfTemplate, 'main');

  // Replace inputs with ctx
  const newFunc = script
    .replace('{{= inputs.parameters.workflow_parameters }}', `${ctx.workflowParameters ?? '[]'}`)
    .replace('{{inputs.parameters.workflow_status}}', `${ctx.workflowStatus ?? 'Failed'}`);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(newFunc)();
}

describe('exit handler script template', () => {
  it('should log workflow status and parameters', (t) => {
    const spy = t.mock.method(console, 'log');

    runTestFunction({
      workflowParameters: JSON.stringify([
        { name: 'source', value: 's3://linz-topographic-upload/abc/', description: 'Source bucket' },
        { name: 'ticket', value: 'GDE-123', description: 'JIRA Ticket' },
      ]),
      workflowStatus: `Succeeded`,
    });

    assert.equal(spy.mock.callCount(), 1);

    const logOutputDict = JSON.parse(String(spy.mock.calls[0]?.arguments[0])) as { time: number };

    // override time
    logOutputDict.time = 1724037007216;

    assert.deepEqual(logOutputDict, {
      time: 1724037007216,
      level: 20,
      pid: 1,
      msg: 'Workflow:Done',
      workflowStatus: 'Succeeded',
      parameters: { source: 's3://linz-topographic-upload/abc/', ticket: 'GDE-123' },
    });
  });
});
