import base from '@linzjs/style/oxfmt.config';
import { defineConfig } from 'oxfmt';

// oxfmt has no `extends`, so spread the LINZ base config
export default defineConfig({
  ...base,
  // CHANGELOG.md is written by release-please
  ignorePatterns: [...base.ignorePatterns, 'CHANGELOG.md'],
});
