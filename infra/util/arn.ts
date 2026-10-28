import type { ArnComponents } from 'aws-cdk-lib';
import { Arn, ArnFormat } from 'aws-cdk-lib';
import { Node } from 'constructs';

/**
 * Validate that a object is a AWS IAM role arn
 *
 * @param arn arn to validate
 * @returns ARN if valid
 * @throws {Error} If ARN is not for a AWS IAM Role
 */
export function validateRoleArn(arn: unknown): ArnComponents {
  if (typeof arn !== 'string') throw new Error('Failed to parse ARN, is not a string');
  if (arn.includes('*')) throw new Error(`ARN cannot include "*" ${arn}`);
  try {
    const components = Arn.split(arn, ArnFormat.SLASH_RESOURCE_NAME);
    if (components.service !== 'iam') throw new Error('ARN is not a iam service');
    if (components.resource !== 'role') throw new Error('ARN is not a role');
    return components;
  } catch (e) {
    throw new Error(`Failed to parse ARN: "${arn}"`, { cause: e });
  }
}

/**
 *
 * Lookup a list of role ARNs from context
 *
 * @throws {Error} If any arn is invalid
 * @returns arns if they are valid, null otherwise
 */
export function tryGetContextArns(node: Node, context: string): string[] {
  let ctx = node.tryGetContext(context) as unknown;
  if (ctx == null) return [];
  if (typeof ctx === 'string') {
    ctx = ctx.split(',');
  }
  if (!Array.isArray(ctx)) throw new Error('Failed to parse ARN, is not a string[]');
  for (const arn of ctx) validateRoleArn(arn);
  return ctx as string[];
}
