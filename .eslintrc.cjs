const cfg = {
  ...require('@linzjs/style/.eslintrc.cjs'),
};
// Disable no floating promises in tests until https://github.com/nodejs/node/issues/51292 is solved
const testOverrides = cfg.overrides.find((ovr) => ovr.files.find((f) => f.includes('.test.ts')));
testOverrides.rules['@typescript-eslint/no-floating-promises'] = 'off';

cfg.overrides.push({
  /** Overrides for YAML */
  files: ['*.yaml', '*.yml'],
  extends: ['plugin:yml/standard'],
  rules: {
    // Prettier uses single quotes so be consistent
    'yml/quotes': ['error', { prefer: 'single' }],
    // Prettier will reformat this back into a single line
    'yml/block-sequence-hyphen-indicator-newline': ['off'],
    // Prettier will sometimes convert these to multiline, so be safe and always use multi
    'yml/block-sequence': ['error', { singleline: 'always' }],
  },
  parser: 'yaml-eslint-parser',
});

module.exports = cfg;
