import assert from 'node:assert';
import fs from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Read the workflow YAML file and create a function from the script inside.
 * replacing {{ inputs.* }} with ctx
 *
 * @param {*} ctx
 * @returns Function that requires a `context` and `core` parameter
 */
function createTestFunction(ctx) {
  const func = fs.readFileSync('./templates/common/exit.handler.yml', 'utf-8').split('source: |')[1];

  const newFunc = func
    // Replace inputs
    .replace('{{= inputs.parameters.workflow_parameters }}', `${ctx.workflowParameters ?? '[]'}`)
    .replace('{{inputs.parameters.workflow_status}}', `${ctx.workflowStatus ?? 'Failed'}`)
    .split('\n')
    .join('\n');
  //console.log(newFunc);
  return new Function('context', newFunc);
}

function runScript(ctx) {
  const action = createTestFunction(ctx);

  const output = {};
  action();

  return output;
}

describe('exit handler script template', () => {
  it('should log workflow status and parameters', () => {
    const originalLog = console.log;
    let logOutput = [];
    console.log = (...args) => logOutput.push(args.join(' '));

    runScript({
      workflowParameters: `[
          { name: 'source', value: 's3://linz-topographic-upload/abc/', description: 'Source bucket' },
          { name: 'ticket', value: 'GDE-123', description: 'JIRA Ticket' },
        ]`,
      workflowStatus: `Succeeded`,
    });

    console.log = originalLog;
    let logOutputDict = JSON.parse(logOutput);
    // override time
    logOutputDict.time = 1724037007216;

    assert.deepEqual(logOutputDict, {
      time: 1724037007216,
      level: 20,
      pid: 1,
      msg: 'Workflow:Succeeded',
      workflowGroup: 'land',
      parameters: { source: 's3://linz-topographic-upload/abc/', ticket: 'GDE-123' },
    });
  });

  it('should log workflowGroup as land', () => {
    const originalLog = console.log;
    let logOutput = [];
    console.log = (...args) => logOutput.push(args.join(' '));

    runScript({
      workflowParameters: `[
          { name: 'source', value: 's3://linz-topographic-upload/abc/'},
        ]`,
    });
    console.log = originalLog;
    const logOutputDict = JSON.parse(logOutput);

    assert.equal(logOutputDict.workflowGroup, 'land');
  });

  it('should log workflowGroup as sea', () => {
    const originalLog = console.log;
    let logOutput = [];
    console.log = (...args) => logOutput.push(args.join(' '));

    runScript({
      workflowParameters: `[
          { name: 'source', value: 's3://linz-hydrographic-upload/abc/'},
        ]`,
    });

    console.log = originalLog;
    const logOutputDict = JSON.parse(logOutput);

    assert.equal(logOutputDict.workflowGroup, 'sea');
  });

  it('should log workflowGroup as unknown', () => {
    const originalLog = console.log;
    let logOutput = [];
    console.log = (...args) => logOutput.push(args.join(' '));

    runScript({
      workflowParameters: `[
          { name: 'source', value: 's3://linz-bucket/abc/'},
        ]`,
    });

    console.log = originalLog;
    const logOutputDict = JSON.parse(logOutput);

    assert.equal(logOutputDict.workflowGroup, 'unknown');
  });
});
