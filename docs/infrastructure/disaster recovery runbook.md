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
6. [`jq`](https://jqlang.github.io/jq/)

## Setup

We need to make sure we're starting from a sane repository state. Skip any steps you're _sure_ you don't need to do:

1. Clone this repository: `git clone git@github.com:linz/topo-workflows.git`
2. Go into repository: `cd topo-workflows`
3. Clean the repository of any generated files: `git clean -d --force -x`
4. Reset any changes to files: `git reset --hard HEAD`
5. Check out the relevant branch: `git checkout BRANCH`
6. Install dependencies: `npm install`
7. Use `aws-azure-login` to log in to `li-topo-prod` as `AccountAdminRole`

## [Teardown existing cluster](docs/infrastructure/destroy.md)

If any of the cluster infrastructure exists but is not functional, see the above link for how to tear it down completely.

## Update database version if necessary

1. Get the details of the most recent production database snapshot: `aws rds describe-db-snapshots --output json --query="sort_by(DBSnapshots[?contains(DBSnapshotIdentifier,'workflows-argodb')], &SnapshotCreateTime)[-1]"`
2. Compare `EngineVersion` from the above output to `PostgresEngineVersion.VER_` in the code.
3. Update `PostgresEngineVersion.VER_` in the code with the snapshot `EngineVersion`.
4. Git commit and push the change above (if applicable).

## Deployment of new cluster

1. Set AWS Account ID for CDK: `export CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"`
2. Deploy prod cluster using all the relevant roles as maintainers:

   ```
   ci_role="$(aws iam list-roles | jq --raw-output '.Roles[] | select(.RoleName | contains("CiTopo")) | select(.RoleName | contains("-CiRole")).Arn')"
   admin_role="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/AccountAdminRole"
   workflow_maintainer_role="$(aws cloudformation describe-stacks --stack-name=TopographicSharedResourcesProd | jq --raw-output .Stacks[0].Outputs[0].OutputValue)"
   npx cdk deploy --context=maintainer-arns="${ci_role},${admin_role},${workflow_maintainer_role}" Workflows
   ```
3. Deploy Argo Workflows without archiving:
   1. Connect AWS CLI to the new cluster: `aws eks update-kubeconfig --name=Workflows`
   2. Create the Argo Workflows configuration files: `npx cdk8s synth`
   3. Remove the `persistence` section of `dist/0005-argo-workflows.k8s.yaml` to disable workflow archiving to database.
   4. Apply the configuration files twice (may fail the first time due to CRD async behaviour): `kubectl apply --filename=dist/`
4. Create a temporary RDS database from the snapshot identified when finding the engine version above:
   TODO: rewrite command below without using jq
   1. Get details of the new cluster database: `aws rds describe-db-instances --query="DBInstances[?DBName=='argo'].{EndpointAddress: Endpoint.Address, DBSubnetGroupName: DBSubnetGroup.DBSubnetGroupName, VpcSecurityGroupIds: VpcSecurityGroups[].VpcSecurityGroupId}"`.
   2. Go to https://ap-southeast-2.console.aws.amazon.com/rds/home?region=ap-southeast-2#db-snapshot:engine=postgres;id=ID, replacing "ID" with the `DBSnapshotIdentifier`.
   3. Click on _Actions_ → _Restore snapshot_.
   4. Under _Availability and durability_: select _Single DB Instance_.
   5. Under _Settings_ set _DB instance identifier_ to "temp-argo-db".
   6. Under _Instance configuration_: select _Burstable classes_ and _db.t3.micro_.
   7. Under _Connectivity_ → _DB subnet group_: select the DB subnet group of the new cluster.
   8. Under _Connectivity_ → _Existing VPC security groups_: select the VPC security group of the new cluster.
   9. Click _Restore DB instance_.
   10. Wait for the temporary DB to get to the "Available" state.
5. Dump the temporary database to the new Argo database:
   1. Submit a ["sleep" workflow](workflows/test/sleep.yml) to the new Argo Workflows installation to spin up a pod:
   `argo submit --namespace=argo workflows/test/sleep.yml`. This will be used to connect to RDS to dump the database to a file.
   2. Connect to the sleep pod (it can take a while for the pod to spin up, so you might have to retry the second command): 
   ```
   pod_name="$(kubectl --namespace=argo get pods --output=name | grep --only-matching 'test-sleep-.*')"
   kubectl --namespace=argo exec --stdin --tty "$pod_name" -- /bin/bash
   ```
   3. Install the PostgreSQL client:
   ```
   apt update
   apt install -y postgresql-client
   ```
   4. Get the temporary db endpoint address: `aws rds describe-db-instances --query="DBInstances[?DBName=='temp-argo-db'].Endpoint.Address"`
   5. Dump the database from the temporary database, replacing ENDPOINT with the temp-argo-db endpoint address: `pg_dump --host=ENDPOINT --username=argo_user --dbname=argo > argodbdump`.
   You will be prompted for a password, get the password from the [AWS Systems Manager Parameter Store](https://ap-southeast-2.console.aws.amazon.com/systems-manager/parameters/%252Feks%252Fargo%252Fpostgres%252Fpassword/description?region=ap-southeast-2&tab=Table).
   6. Load the database into the new Argo database, replacing ENDPOINT with the new cluster endpoint address:
   `psql --host=ENDPOINT --username=argo_user --dbname=argo < argodbdump`
   You will be prompted for a password, get the password from the [AWS Systems Manager Parameter Store](https://ap-southeast-2.console.aws.amazon.com/systems-manager/parameters/%252Feks%252Fargo%252Fpostgres%252Fpassword/description?region=ap-southeast-2&tab=Table).
6. Redeploy the cluster configuration files to enable the connection to the database and turn on workflow archiving:
   1. Run `npx cdk8s synth` to recreate the `persistence` section in `dist/0005-argo-workflows.k8s.yaml`.
   2. Redeploy the Argo config file: `kubectl replace --filename=dist/0005-argo-workflows.k8s.yaml`
   3. Restart the workflow controller and the server:
   ```
   kubectl rollout restart deployment argo-workflows-workflow-controller -n argo
   kubectl rollout restart deployment argo-workflows-server -n argo
   ```
7. Tidy up
   1. Delete the temporary database you created in the AWS web console -> RDS or with `aws rds delete-db-instance --db-instance-identifier=ID --skip-final-snapshot`
   2. Terminate the sleep workflow: `argo --namespace=argo stop "$(argo --namespace=argo list --output=name)"`


- Smoke test
- Notify users of availability

