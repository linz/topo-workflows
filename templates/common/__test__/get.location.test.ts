import assert from 'node:assert';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { runTestFunction } from './function.helper.ts';

describe('get-location script template', () => {
  it('should output workflow artifact location', (t) => {
    const spy = t.mock.method(console, 'log');
    const shimRequired: string[] = [];
    runTestFunction(
      './templates/common/get.location.yml',
      [
        {
          toReplace: '{{inputs.parameters.artifact_key}}',
          replaceWith: '2024-10/02-test-get-location-29l4x',
        },
        {
          toReplace: 'process.env.ARTIFACT_BUCKET',
          replaceWith: `'linz-workflows-scratch'`,
        },
      ],
      (req) => {
        if (req !== 'node:fs') throw new Error('Failed');
        shimRequired.push(req);
        return fs;
      },
    );
    assert.equal(spy.mock.callCount(), 1);

    const logOutputDict = JSON.parse(String(spy.mock.calls[0]?.arguments[0])) as { time: number };

    assert.deepEqual(logOutputDict, {
      time: logOutputDict.time,
      level: 20,
      pid: 1,
      msg: 'Workflow:Location',
      location: 's3://linz-workflows-scratch/2024-10/02-test-get-location-29l4x/',
      bucket: 'linz-workflows-scratch',
      key: '2024-10/02-test-get-location-29l4x',
    });
    assert.deepEqual(shimRequired, ['node:fs']);
  });
});
