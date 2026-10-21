#!/usr/bin/env bash
# Wait for all other checks on a commit, fail if any of them failed
set -euo pipefail

sleep "${DELAY}"

while true; do
  checks=$(
    gh api --paginate "repos/${REPO}/commits/${SHA}/check-runs?per_page=100" \
      --jq '.check_runs[] | select(.name != env.SELF) | "\(.status) \(.conclusion // "-") \(.name)"'
    gh api "repos/${REPO}/commits/${SHA}/status" \
      --jq '.statuses[] | "\(if .state == "pending" then "pending -" else "completed \(.state)" end) \(.context)"'
  )
  failed=$(grep '^completed ' <<<"${checks}" | grep -Ev '^completed (success|skipped|neutral) ' || true)
  pending=$(grep -v '^completed ' <<<"${checks}" || true)

  if [[ -n "${failed}" ]]; then
    printf 'Failed:\n%s\n' "${failed}"
    exit 1
  fi
  if [[ -z "${pending}" ]]; then
    printf 'Passed:\n%s\n' "${checks}"
    exit 0
  fi
  printf 'Waiting for:\n%s\n' "${pending}"
  sleep 15
done
