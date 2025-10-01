import assert from 'node:assert';
import { describe, it } from 'node:test';

import { runTestFunction } from './function.helper.js';

describe('notification handler script template', () => {
  it('should log workflow status and custom parameters', (t) => {
    const spy = t.mock.method(console, 'log');

    runTestFunction('./templates/common/notification.handler.yml', [
      {
        toReplace: '{{= toJson(inputs.parameters) }}',
        replaceWith: JSON.stringify({
          custom_parameter: 'foo',
          workflow_parameters:
            '[{"name":"source","value":"s3://linz-topographic-upload/abc/","description":"Source bucket"},{"name": "ticket", "value": "GDE-123","description":"JIRA Ticket"}]',
        }),
      },
      { toReplace: '{{inputs.parameters.msg}}', replaceWith: 'UnarchiveCopy:Done' },
      { toReplace: '{{workflow.status}}', replaceWith: 'Running' },
    ]);

    assert.equal(spy.mock.callCount(), 1);

    const logOutputDict = JSON.parse(String(spy.mock.calls[0]?.arguments[0])) as { time: number };

    // override time
    logOutputDict.time = 1724037007216;

    assert.deepEqual(logOutputDict, {
      time: 1724037007216,
      level: 20,
      pid: 1,
      msg: 'UnarchiveCopy:Done',
      workflowStatus: 'Running',
      parameters: {
        custom_parameter: 'foo',
        source: 's3://linz-topographic-upload/abc/',
        ticket: 'GDE-123',
      },
    });
  });
});
