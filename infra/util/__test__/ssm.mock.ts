import type { Parameter } from '@aws-sdk/client-ssm';

export class MockSSM {
  private responses: Record<string, string>;

  constructor(responses: Record<string, string> = {}) {
    this.responses = responses;
  }

  getParameters(params: { Names: string[]; WithDecryption?: boolean }): Promise<{ Parameters?: Parameter[] }> {
    const Parameters: Parameter[] = params.Names.filter((name) => name in this.responses).map((name) => ({
      Name: name,
      Value: this.responses[name],
    }));
    return Promise.resolve({ Parameters });
  }
}
