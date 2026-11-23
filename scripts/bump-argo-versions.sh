#!/usr/bin/env bash
# Propagate appVersion from infra/charts/argo.{workflows,events}.ts to CI, cdk8s.yaml and schema headers
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

app_version() {
  local version
  version=$(sed -n "s/^const appVersion = '\(.*\)';$/\1/p" "$1")
  [[ ${version} =~ ^v[0-9]+(\.[0-9]+){2}$ ]] || { echo "No vX.Y.Z appVersion in $1" >&2; exit 1; }
  echo "${version}"
}
workflows=$(app_version infra/charts/argo.workflows.ts)
events=$(app_version infra/charts/argo.events.ts)

checksums="https://github.com/argoproj/argo-workflows/releases/download/${workflows}/argo-workflows-cli-checksums.txt"
sha256=$(curl --fail --location --silent --show-error "${checksums}" | awk '$2 == "argo-linux-amd64.gz" { print $1 }')
[[ ${sha256} =~ ^[0-9a-f]{64}$ ]] || { echo "No argo-linux-amd64.gz checksum in ${checksums}" >&2; exit 1; }

# Set the version after <prefix> in the files under <paths>, e.g. argo-events/v1.9.10/ to argo-events/v1.9.11/
set_version() {
  local prefix=$1 version=$2
  local pattern="${prefix}v[0-9][^/]*/"
  shift 2
  git grep --untracked -q -E "${pattern}" -- "$@" || { echo "No ${prefix}vX.Y.Z/ in $*" >&2; exit 1; }
  git grep --untracked -lz -E "${pattern}" -- "$@" | xargs -0 perl -pi -e "s#${pattern}#${prefix}${version}/#g"
}

set_version argoproj/argo-workflows/ "${workflows}" templates workflows
set_version argoproj/argo-events/ "${events}" events
set_version argo-workflows/releases/download/ "${workflows}" .github/workflows/main.yml .github/workflows/publish.yml
set_version argo-events/refs/tags/ "${events}" cdk8s.yaml
perl -pi -e "s#ARGO_SHA256: .*#ARGO_SHA256: ${sha256}#" .github/workflows/main.yml .github/workflows/publish.yml

echo "Argo Workflows ${workflows} (argo-linux-amd64.gz ${sha256}), Argo Events ${events}"
