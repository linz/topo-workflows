import base from '@linzjs/style/oxlint.config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [base],
  env: {
    node: true,
    es2023: true,
  },
  rules: {
    // allow single line `if (x) throw ...` as was allowed with eslint
    curly: ['error', 'multi-line'],
  },
  // Ignore generated CDK8s imports
  ignorePatterns: ['infra/charts/imports/**'],
  overrides: [
    {
      // Disable no floating promises in tests until https://github.com/nodejs/node/issues/51292 is solved
      files: ['**/*.test.ts'],
      rules: {
        'typescript/no-floating-promises': 'off',
      },
    },
  ],
});
