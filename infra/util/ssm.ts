import { SSM } from '@aws-sdk/client-ssm';
import type { Parameter } from '@aws-sdk/client-ssm';

/**
 * Attempt to load a collection of SSM parameters throwing if any parameter cannot be found
 *
 * @param query - An object mapping keys to SSM parameter names. The output will be an object with the same keys mapped to the parameter values.
 * @param ssmClient - An optional SSM client to use, primarily for testing purposes. Defaults to a real SSM client.
 *
 * @example
 * ```typescript
 * const result = fetchSsmParameters({ clientId: '/eks/client-id', dbPassword: '/eks/rds/password'})
 * result.clientId // Value of '/eks/client-id'
 * ```
 *
 * @throws if a parameter is missing from the store
 */
export async function fetchSsmParameters<T extends Record<string, string>>(
  query: T,
  ssmClient: {
    getParameters(params: { Names: string[]; WithDecryption?: boolean }): Promise<{ Parameters?: Parameter[] }>;
  } = new SSM(),
): Promise<T> {
  const paramNames = Object.values(query);

  // "Maximum number of 10 items": https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameters.html#API_GetParameters_RequestParameters
  const chunks: string[][] = [];
  for (let i = 0; i < paramNames.length; i += 10) {
    chunks.push(paramNames.slice(i, i + 10));
  }

  const responses = await Promise.all(
    chunks.map((chunk) => ssmClient.getParameters({ Names: chunk, WithDecryption: true })),
  );

  const allParams: Parameter[] = responses.flatMap((r) => r.Parameters ?? []);

  const output: Record<string, string> = {};
  const missing: string[] = [];

  for (const [key, parameterName] of Object.entries(query)) {
    const val = allParams.find((p) => p.Name === parameterName);
    if (!val || val.Value === undefined) {
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
