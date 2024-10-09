# Disaster recovery runbook

**Warning:** If going through this process when the cluster is still functional, make sure to agree on a time for the deployment with the end users. Teardown and restore should not take more than 4 hours.

## Purpose

Rebuild the Argo Workflows cluster from scratch, restoring existing database contents. Using the current versions of everything.

## Prerequisites

Install the following software:

1. [`node`](https://nodejs.org/)
2. [`helm`](https://helm.sh/docs/intro/install/)
3. [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/) - should be the same version as the EKS version of the original cluster. At time of writing, this is only available by looking for `KubernetesVersion.of('VERSION')` in the code (`KubernetesVersion.of('1.30')` as of right now).
4. [`argo`](https://github.com/argoproj/argo-workflows/releases/) - should be the same version as the Argo Workflows Server version of the original cluster. At time of writing, this is only available by looking for `appVersion = 'vVERSION'` in the code (`appVersion = 'v3.5.5'` as of right now).
5. [`aws-azure-login`](https://toitutewhenua.atlassian.net/wiki/spaces/GEOD/pages/86418747/Login+to+AWS+Service+Accounts+via+Azure+in+Command+Line). You need to be able to log in using the following accounts and roles to restore production:
   - `li-topo-prod` as `AccountAdminRole`
   - `odr-access-prod` as `AccountAdminRole`, then sub-profile `odr-prod-admin`

## Teardown instructions

If any of the cluster infrastructure exists but is not functional, how to tear it down completely.

## Setup

### Repository state

We need to make sure we're starting from a sane repository state. Skip any steps you're _sure_ you don't need to do:

1. Clone this repository: `git clone git@github.com:linz/topo-workflows.git`
2. Go into repository: `cd topo-workflows`
3. Clean the repository of any generated files: `git clean -d --force -x`
4. Check out the relevant branch: `git checkout BRANCH`
5. Install dependencies: `npm install`

- Repo setup (clone, clean, check out relevant branch, `git clean -fdx`), `npm i`
- Login
- Deploy
- Restore from temp DB
- Smoke test
- Notify users of availability
