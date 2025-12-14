# Disaster Recovery runbook

**Warning:** If going through this process when the cluster is still functional, make sure to agree on a time for the deployment with the end users. Teardown and restore should not take more than 4 hours.

## Prerequisites

1. [`node`](https://nodejs.org/)
2. [`helm`](https://helm.sh/docs/intro/install/)
3. [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/) - should be the same version as the EKS version of the original cluster. At time of writing, this is only available by looking for `KubernetesVersion.Vx_yy` in the code (for example, `KubernetesVersion.V1_32')`).
4. [`argo`](https://github.com/argoproj/argo-workflows/releases/) - should be the same version as the Argo Workflows Server version of the original cluster. At time of writing, this is only available by looking for `appVersion = 'vVERSION'` in the code (for example, `appVersion = 'v3.6.12'`).
5. You need to be able to log in using the following AWS accounts and roles to restore production:
   - LI Topo production account as admin
   - ODR access account as admin using the admin profile

## EKS cluster

### Purpose

Rebuild the EKS cluster and Argo Workflows from scratch, while keeping the RDS database up.

### Setup

We need to make sure we're starting from a sane repository state. Skip any steps you're _sure_ you don't need to do:

1. Clone the [Open Data Registry repo](https://github.com/linz/open-data-registry-cdk/): `git clone git@github.com:linz/open-data-registry-cdk.git`
2. Go into the Open Data Registry repo: `cd open-data-registry-cdk`.
3. Install dependencies: `npm install`.
4. Exit the Open Data Registry repo: `cd ..`.
5. Clone the [Topo AWS infrastructure repo](https://github.com/linz/topo-aws-infrastructure/): `git clone git@github.com:linz/topo-aws-infrastructure.git`
6. Clone [this repo](https://github.com/linz/topo-workflows/): `git clone git@github.com:linz/topo-workflows.git`
7. Go into the Topo workflows repo: `cd topo-workflows`
8. Clean the repository of any generated files: `git clean -d --force -x`
9. Reset any changes to files: `git reset --hard HEAD`
10. Check out the relevant commit: `git checkout ID`. This could be `origin/master`, the commit used to deploy the old production cluster,
11. Install dependencies: `npm install`
12. Log into the LI Topo production account as admin

### [Teardown existing EKS cluster](./destroy.md)

If any of the cluster infrastructure exists but is not functional, see the above link for how to tear it down completely.

### Deployment of new cluster

1. Set AWS Account ID for CDK: `export CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"`.
2. Deploy prod cluster using all the relevant roles as maintainers:

   ```shell
   ci_role="$(aws iam list-roles --output=text --query="Roles[?starts_with(RoleName, 'CiTopoProd-CiRole')].Arn")"
   admin_role="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/AccountAdminRole"
   workflow_maintainer_role="$(aws cloudformation describe-stacks --output=text --query="Stacks[].Outputs[].OutputValue" --stack-name=TopographicSharedResourcesProd)"
   npx cdk deploy --context=maintainer-arns="${ci_role},${admin_role},${workflow_maintainer_role}" Workflows
   ```

3. Deploy Kubernetes components:

   1. Connect AWS CLI to the new cluster: `aws eks update-kubeconfig --name=Workflows`.
   2. Create the Argo Workflows configuration files: `npx cdk8s synth`.
   3. (ONLY IF [RECREATING DATABASE](#rds-database)) Remove the `persistence` section of `dist/0005-argo-workflows.k8s.yaml` to disable workflow archiving to database. For example:

      ```patch
      --- dist/0005-argo-workflows.k8s.yaml.orig
      +++ dist/0005-argo-workflows.k8s.yaml
      @@ -88,26 +88,6 @@
               keyFormat: "{{workflow.creationTimestamp.Y}}-{{workflow.creationTimestamp.m}}/{{workflow.creationTimestamp.d}}-{{workflow.name}}/{{pod.name}}"
               region: ap-southeast-2
               useSDKCreds: true
      -    persistence:
      -      [redacted]
      -        tableName: argo_workflows
           workflowDefaults:
             spec:
               parallelism: 3
      ```

   4. Apply the configuration files twice (may fail the first time due to [CRD async behaviour](initial.deployment.md#custom-resource-definitions)): `kubectl apply --filename=dist/`.

4. Trigger deployment of Argo workflows. If you created a pull request [above](#update-database-version-if-necessary), merging it will trigger the job. Otherwise you have to trigger the [main workflow](https://github.com/linz/topo-workflows/actions/workflows/main.yml) manually.

### Open Data Registry

**Warning:** This section is for _production only._ When developing in non-prod environments, skip to the next section.

1. Go to the repo with the ODR configuration: `cd ../topo-aws-infrastructure`.
2. Copy the [LINZ Open Data Registry account](https://github.com/linz/topo-aws-infrastructure/blob/master/src/accounts/odr/README.md) CDK context declaration here: `cp ../topo-aws-infrastructure/src/accounts/odr/cdk.context.json .`.
3. Update the ARN of the role with a name starting with "Workflows-EksWorkflowsArgoRunnerServiceAccountRole" in `cdk.context.json` to the output of `aws iam list-roles --output=text --query="Roles[?contains(RoleName, 'Workflows-EksWorkflowsArgoRunnerServiceAccountRole')].RoleName"`.
4. Log into ODR access account as admin using the admin profile.
5. Deploy the ODR datasets stack: `npx cdk deploy Datasets`.
6. Commit the updated CDK context:
   1. `cp cdk.context.json ../topo-aws-infrastructure/src/accounts/odr/cdk.context.json`
   2. `cd ../topo-aws-infrastructure`
   3. Commit, push, and create a pull request for this branch.

### Finalise

1. Ask EPT to whitelist the new EKS cluster API endpoint.
2. Let the users know that Argo is once again available.

## RDS database

### Purpose

If there is any issue on the RDS instance that can't be recovered, we might have to destroy it and the EKS cluster, and recreate both.

### Update database version (if necessary)

1. Create a manual snapshot of the database instance, using the AWS Web Console: "Aurora and RDS" > "Databases" > Click on the prod DB (`argodb-*`) > "Maintenance & backups" > "Snapshots - Take snapshot"
2. Compare `EngineVersion` from the snapshot to `PostgresEngineVersion.VER_` in the code.
3. Update `PostgresEngineVersion.VER_` in the code with the snapshot `EngineVersion`.
4. Git commit and push the change above (if applicable).

### Delete EKS cluster and the RDS database

**The cluster has a dependency on the database so if the database is deleted, the cluster needs to be deleted too.**

1. [Teardown existing EKS cluster](./destroy.md/#destroy-eks-cluster)
2. [Destroy the RDS database stack](./destroy.md/#destroy-rds)

### Recreate the RDS database and the EKS cluster

1. Deploy the Database: `npx cdk deploy ArgoDb -c aws-account-id=[AWS_ACCOUNT]`

2. [Deploy the EKS cluster](#deployment-of-new-cluster)

3. Create a temporary RDS database from [the manual snapshot created](#update-database-version-if-necessary):

   1. Get details of the new cluster database: `aws rds describe-db-instances --query="DBInstances[?DBName=='argo'].{EndpointAddress: Endpoint.Address, DBSubnetGroupName: DBSubnetGroup.DBSubnetGroupName, VpcSecurityGroupIds: VpcSecurityGroups[].VpcSecurityGroupId}"`.
   2. Go to https://ap-southeast-2.console.aws.amazon.com/rds/home?region=ap-southeast-2#db-snapshot:engine=postgres;id=ID, replacing "ID" with the `DBSnapshotIdentifier` of the manual snapshot.
   3. Click on _Actions_ → _Restore snapshot_.
   4. Under _Availability and durability_: select _Single-AZ DB Instance deployment_.
   5. Under _Settings_ set _DB instance identifier_ to "temp-argo-db".
   6. Under _Instance configuration_: select _Burstable classes_ and _db.t3.micro_.
   7. Under _Connectivity_ → _DB subnet group_: select the DB subnet group of the new cluster.
   8. Under _Connectivity_ → _Existing VPC security groups_: select the VPC security group of the new cluster.
   9. Click _Restore DB instance_.
   10. Wait for the temporary DB to get to the "Available" state.

4. Dump the temporary database to the new Argo database:

   1. Submit a ["sleep" workflow](../../workflows/test/sleep.yml) to the new Argo Workflows installation to spin up a pod:
      `argo submit --namespace=argo workflows/test/sleep.yml`. This will be used to connect to RDS to dump the database to a file.
   2. Connect to the sleep pod (it can take a while for the pod to spin up, so you might have to retry the second command):

      ```shell
      pod_name="$(kubectl --namespace=argo get pods --output=name | grep --only-matching 'test-sleep-.*')"
      kubectl --namespace=argo exec --stdin --tty "$pod_name" -- /bin/bash
      ```

   3. Install the PostgreSQL client:

      ```shell
      apt update
      apt install -y postgresql-client
      ```

   4. Get the temporary db endpoint address: `aws rds describe-db-instances --query="DBInstances[?DBName=='temp-argo-db'].Endpoint.Address"`.
   5. Dump the database from the temporary database, replacing ENDPOINT with the temp-argo-db endpoint address: `pg_dump --host=ENDPOINT --username=argo_user --dbname=argo > argodbdump`.
      You will be prompted for a password, get the password from the [AWS Systems Manager Parameter Store](https://ap-southeast-2.console.aws.amazon.com/systems-manager/parameters/%252Feks%252Fargo%252Fpostgres%252Fpassword/description?region=ap-southeast-2&tab=Table).
   6. Load the database into the new Argo database, replacing ENDPOINT with the new cluster endpoint address:
      `psql --host=ENDPOINT --username=argo_user --dbname=argo < argodbdump`.
      You will be prompted for a password, get the password from the [AWS Systems Manager Parameter Store](https://ap-southeast-2.console.aws.amazon.com/systems-manager/parameters/%252Feks%252Fargo%252Fpostgres%252Fpassword/description?region=ap-southeast-2&tab=Table).

5. Redeploy the cluster configuration files to enable the connection to the database and turn on workflow archiving:

   1. Run `npx cdk8s synth` to recreate the `persistence` section in `dist/0005-argo-workflows.k8s.yaml`.
   2. Redeploy the Argo config file: `kubectl replace --filename=dist/0005-argo-workflows.k8s.yaml`.
   3. Restart the workflow controller and the server:

      ```shell
      kubectl --namespace=argo rollout restart deployment argo-workflows-workflow-controller
      kubectl --namespace=argo rollout restart deployment argo-workflows-server
      ```

### Finalise

1. Ask EPT to whitelist the new EKS cluster API endpoint.
2. Let the users know that Argo is once again available.
3. Tidy up
   1. Delete the _temporary_ database in the AWS web console → RDS or with `aws rds delete-db-instance --db-instance-identifier=ID --skip-final-snapshot`
   2. Terminate the sleep workflow: `argo --namespace=argo stop "$(argo --namespace=argo list --output=name)"`
