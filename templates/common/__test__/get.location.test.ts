import assert from 'node:assert';
import { describe, it } from 'node:test';

import { runTestFunction, shimRequired } from './function.helper.js';

describe('get-location script template', () => {
  it('should output workflow artifact location', (t) => {
    const spy = t.mock.method(console, 'log');
    runTestFunction(
      './templates/common/get.location.yml',
      [
        {
          toReplace: `JSON.parse(process.env['ARGO_TEMPLATE'])`,
          replaceWith: JSON.stringify({
            archiveLocation: {
              s3: {
                key: '2024-10/02-test-get-location-29l4x/test-get-location-29l4x-get-location-3125883809',
                bucket: 'linz-workflows-scratch',
              },
            },
          }),
        },
      ],
      'node:fs',
    );
    assert.equal(spy.mock.callCount(), 3);

    const location = String(spy.mock.calls[0]?.arguments[0]);
    assert.equal(location, 'Location: s3://linz-workflows-scratch/2024-10/02-test-get-location-29l4x/');

    const bucket = String(spy.mock.calls[1]?.arguments[0]);
    assert.equal(bucket, 'Bucket: linz-workflows-scratch');

    const key = String(spy.mock.calls[2]?.arguments[0]);
    assert.equal(key, 'Key: 2024-10/02-test-get-location-29l4x');

    assert.deepEqual(shimRequired, ['node:fs']);
  });
});
