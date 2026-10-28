import base from '@linzjs/style/oxlint.config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [base],
  env: {
    node: true,
    es2023: true,
  },
  rules: {
    // allow single line `if (x) throw ...
    curly: ['error', 'multi-line'],
    'prefer-const': 'error',
    'typescript/explicit-function-return-type': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-unsafe-enum-comparison': 'error',
    'typescript/no-unsafe-return': 'error',
    // node:test describe/it return promises that the test runner handles (linz/style-js#1137)
    'typescript/no-floating-promises': [
      'error',
      {
        allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['describe', 'it', 'test', 'suite'] }],
      },
    ],
  },
  ignorePatterns: ['infra/charts/imports/**'],
});
