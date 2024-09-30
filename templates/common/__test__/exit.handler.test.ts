import assert from 'node:assert';
import fs from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Read the workflow YAML file and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 *
 * @param ctx
 */
function runTestFunction(ctx: { workflowParameters: string; workflowStatus: string }): void {
  const func = fs.readFileSync('./templates/common/exit.handler.yml', 'utf-8').split('source: |')[1];
  if (!func) {
    throw new Error('No script found in the workflow');
  }
  const newFunc = func
    // Replace inputs
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
