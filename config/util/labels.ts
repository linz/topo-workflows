import { getGitBuildInfo } from './build';

/**
 * Generate a collection of standard labels for all components
 * @param name The name of the application
 * @param version The current version of the application
 * @param component The component within the architecture
 * @param partOf The name of a higher level application this one is part of
 * @returns labels in the form of `app.kubernetes.io/name`
 */
export function defaultLabels(
  name: string,
  version: string,
  component: string,
  partOf: string,
): Record<string, string> {
  return {
    'app.kubernetes.io/name': name,
    // Force a `v` prefix so the yaml doesn't consider it a number
    'app.kubernetes.io/version': version.startsWith('v') ? version : `v${version}`,
    'app.kubernetes.io/component': component,
    'app.kubernetes.io/part-of': partOf,
    'app.kubernetes.io/managed-by': 'cdk8s',
    'app.kubernetes.io/git-hash': getGitBuildInfo().hash,
    'app.kubernetes.io/git-version': getGitBuildInfo().version,
    'app.kubernetes.io/build-id': getGitBuildInfo().buildId,
  };
}

/**
 * Generate and apply a collection of standard labels for all components
 * @param name The name of the application
 * @param version The current version of the application
 * @param component The component within the architecture
 * @param partOf The name of a higher level application this one is part of
 *
 * @returns labels in the form of `app.kubernetes.io/name`
 */
export function applyDefaultLabels<T extends { labels?: Record<string, string> }>(
  props: T,
  name: string,
  version: string,
  component: string,
  partOf: string,
): T {
  return {
    ...props,
    labels: {
      ...props.labels,
      ...defaultLabels(name, version, component, partOf),
    },
  };
}
