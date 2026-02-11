const cfg = {
  ...require('@linzjs/style/.eslintrc.cjs'),
};

// Ignore generated CDK8s imports
cfg.ignorePatterns = [...(cfg.ignorePatterns || []), 'infra/charts/imports/**'];
cfg.overrides = [
  ...(cfg.overrides || []),
  {
    files: ['infra/charts/**/*.ts'],
    rules: {
      'prettier/prettier': 'off',
    },
  },
];

// Disable no floating promises in tests until https://github.com/nodejs/node/issues/51292 is solved
const testOverrides = cfg.overrides.find((ovr) => ovr.files.find((f) => f.includes('.test.ts')));
testOverrides.rules['@typescript-eslint/no-floating-promises'] = 'off';

module.exports = cfg;
