import { SSM } from '@aws-sdk/client-ssm';

const ssm = new SSM();

/**
 * Attempt to load a collection of SSM parameters throwing if any parameter cannot be found
 *
 * @example
 * ```typescript
 * const result = fetchSsmParameters({ clientId: '/eks/client-id', dbPassword: '/eks/rds/password'})
 * result.clientId // Value of '/eks/client-id'
 * ```
 *
 * @throws if a parameter is missing from the store
 */
export async function fetchSsmParameters<T extends Record<string, string>>(query: T): Promise<T> {
  console.log('FetchSSM', Object.values(query));
  const ret = await ssm.getParameters({ Names: Object.values(query), WithDecryption: true });

  const output: Record<string, string> = {};
  const missing: string[] = [];
  for (const [key, parameterName] of Object.entries(query)) {
    const val = ret.Parameters?.find((f) => f.Name === parameterName);
    if (val == null || val.Value == null) {
      missing.push(parameterName);
      continue;
    }
    output[key] = val.Value;
  }

  if (missing.length > 0) {
    throw new Error('Missing SSM Parameters: ' + missing.join(', '));
  }
  return output as T;
}
