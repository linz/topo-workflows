import base from '@linzjs/style/oxlint.config';
import { defineConfig } from 'oxlint';
export default defineConfig({
  extends: [base],
  // import plugin for import/no-duplicates (linz/style-js#1138)
  plugins: [...base.plugins, 'import'],
  env: {
    node: true,
    es2023: true,
  },
  rules: {
    // overrides for LINZ base config
    curly: ['error', 'multi-line'], // linz/style-js#1136
    'import/no-duplicates': 'error', // linz/style-js#1138
    // node runs .ts directly and needs "import type" when importing types
    'typescript/consistent-type-imports': 'error',
    // node:test describe/it return promises that the test runner handles (linz/style-js#1137)
    'typescript/no-floating-promises': [
      'warn',
      {
        allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['describe', 'it', 'test', 'suite'] }],
      },
    ],
  },
});
