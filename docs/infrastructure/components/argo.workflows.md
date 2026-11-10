# Argo Workflows

Argo Workflows is used to run the workflows inside K8s.
It is deployed using its [Helm chart](https://github.com/argoproj/argo-helm/tree/main/charts/argo-workflows).
An AWS RDS PostgreSQL database instance is used to provide persistent storage for the Archived Workflows feature.

## Upgrade

Read the [upgrade guide](https://argo-workflows.readthedocs.io/en/latest/upgrading/) for every minor version between the current and the target version, and the [Helm chart upgrade notes](https://github.com/argoproj/argo-helm/tree/main/charts/argo-workflows#upgrading).

1. Set `chartVersion` and `appVersion`, and their `Chart.yaml` links, in `infra/charts/argo.workflows.ts`, and in `infra/charts/argo.events.ts` when upgrading Argo Events.
2. Run `scripts/bump-argo-versions.sh`. It updates the files that repeat these versions:
   - `ARGO_URL` and `ARGO_SHA256` in `.github/workflows/main.yml` and `.github/workflows/publish.yml`, the SHA256 of `argo-linux-amd64.gz` from the release's `argo-workflows-cli-checksums.txt`
   - the Argo Events CRD imports in `cdk8s.yaml`
   - the `# yaml-language-server: $schema=` headers in `templates/`, `workflows/` and `events/`
3. If the Argo Events version changed, regenerate `infra/charts/imports/argo-events/` with `npx cdk8s import`, as for [Karpenter](karpenter.md#import-karpenter-crds-classes).
4. Review the diff. `npm test` fails if any of these files does not match `appVersion`, and CI lints `templates/` and `workflows/` with the new CLI.

Deploy to NonProd first, following [the cluster upgrade deployment steps](../cluster-upgrade.md#non-production). Take an RDS snapshot before the new controller starts, as it migrates the database schema on startup.

Merging any change to `infra/` or `.github/workflows/main.yml` into the `master` branch deploys to production.
