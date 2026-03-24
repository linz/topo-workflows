import assert from 'node:assert';
import { describe, it } from 'node:test';

import { fetchSsmParameters } from '../ssm.ts';
import { MockSSM } from './ssm.mock.ts';

describe('fetchSsmParameters', () => {
  it('should return all parameters when present', async () => {
    const mock = new MockSSM({
      '/eks/client-id': 'CLIENT123',
      '/eks/rds/password': 'PASSWORD456',
    });

    const result = await fetchSsmParameters({ clientId: '/eks/client-id', dbPassword: '/eks/rds/password' }, mock);

    assert.strictEqual(result.clientId, 'CLIENT123');
    assert.strictEqual(result.dbPassword, 'PASSWORD456');
  });

  it('should throw error when a parameter is missing', async () => {
    const mock = new MockSSM({ '/eks/client-id': 'CLIENT123' });

    await assert.rejects(
      async () => await fetchSsmParameters({ clientId: '/eks/client-id', dbPassword: '/eks/rds/password' }, mock),
      { message: 'Missing SSM Parameters: /eks/rds/password' },
    );
  });

  it('should handle batching when more than 10 parameters', async () => {
    const responses: Record<string, string> = {};
    const query: Record<string, string> = {};

    for (let i = 0; i < 15; i++) {
      const name = `/param/${i}`;
      responses[name] = `value-${i}`;
      query[`p${i}`] = name;
    }

    const mock = new MockSSM(responses);
    const result = await fetchSsmParameters(query, mock);

    for (let i = 0; i < 15; i++) {
      assert.strictEqual(result[`p${i}`], `value-${i}`);
    }
  });
});
