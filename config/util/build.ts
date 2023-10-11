import { execFileSync } from 'node:child_process';

interface GitBuildInfo {
  /**
   * Last git version tag
   *
   * @example
   * "v6.45.0"
   */
  version: string;
  /**
   * Current git commit hash
   *
   * @example
   * "e460a1bf611b9464f4c2c3feb48e4823277f14a4"
   */
  hash: string;
  /**
   * Github actions run id and attempt if it exists, otherwise ""
   *
   * @example
   * "6228679664-1"
   */
  buildId: string;
}

let buildInfo: GitBuildInfo | undefined;

/**
 * Attempt to guess build information from the currently checked out version of the source code
 *
 * @returns Basic Git/Github build information
 */
export function getGitBuildInfo(): GitBuildInfo {
  if (buildInfo == null) {
    buildInfo = {
      version: execFileSync('git', ['describe', '--tags', '--always', '--match', 'v*']).toString().trim(),
      hash: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
      buildId: process.env['GITHUB_RUN_ID']
        ? `${process.env['GITHUB_RUN_ID']}-${process.env['GITHUB_RUN_ATTEMPT']}`
        : '',
    };
  }
  return buildInfo;
}
