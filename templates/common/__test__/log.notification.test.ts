import assert from 'node:assert';
import { describe, it } from 'node:test';

import { runTestFunction } from './function.helper.js';

describe('notification script template', () => {
  it('should log workflow status and parameters', (t) => {
    const spy = t.mock.method(console, 'log');

    runTestFunction('./templates/common/log.notification.yml', [
      {
        toReplace: '{{= inputs.parameters.workflow_parameters }}',
        replaceWith: JSON.stringify([
          { name: 'source', value: 's3://linz-topographic-upload/abc/', description: 'Source bucket' },
          { name: 'ticket', value: 'GDE-123', description: 'JIRA Ticket' },
        ]),
      },
      { toReplace: '{{inputs.parameters.workflow_status}}', replaceWith: 'Succeeded' },
      { toReplace: '{{inputs.parameters.msg}}', replaceWith: 'Workflow:Done' },
    ]);

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
