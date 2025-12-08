import assert from 'node:assert';
import { describe, it } from 'node:test';

import { App } from 'aws-cdk-lib';

import { tryGetContextArn, tryGetContextArns, validateRoleArn } from '../eks/arn.ts';

describe('roleArnValidator', () => {
  it('should error if arn is not a valid role', () => {
    assert.throws(() => validateRoleArn(''));
    assert.throws(() => validateRoleArn('ABC'));
    assert.throws(() => validateRoleArn(1));
    assert.throws(() => validateRoleArn(null));
  });

  it('should allow role arns', () => {
    const arn = validateRoleArn('arn:aws:iam::1234567890:role/AccountAdminRole');
    assert.equal(arn.service, 'iam');
    assert.equal(arn.resource, 'role');
    assert.equal(arn.partition, 'aws');
  });

  it('should not allow *', () => {
    assert.throws(() => validateRoleArn('arn:aws:iam::1234567890:role/*'));
  });
});

describe('tryGetContextArn', () => {
  it('should parse from the context, validate, and return the role arn', () => {
    const app = new App();
    app.node.setContext('admin-role', 'arn:aws:iam::1234567890:role/AccountAdminRole');
    const roleArn = tryGetContextArn(app.node, 'admin-role');
    assert.equal(roleArn, 'arn:aws:iam::1234567890:role/AccountAdminRole');
  });
});

describe('tryGetContextArns', () => {
  it('should parse from the context, validate, and return the list of role arns', () => {
    const app = new App();
    app.node.setContext(
      'admin-roles',
      'arn:aws:iam::1234567890:role/AccountAdminRole,arn:aws:iam::1234567890:role/AccountCiRole',
    );
    const roleArns = tryGetContextArns(app.node, 'admin-roles');

    assert.notEqual(roleArns, null);
    // TODO: Is there another way to avoid complaining about being null in a test?
    if (roleArns) {
      assert.equal(roleArns[0], 'arn:aws:iam::1234567890:role/AccountAdminRole');
      assert.equal(roleArns[1], 'arn:aws:iam::1234567890:role/AccountCiRole');
    }
  });
});
