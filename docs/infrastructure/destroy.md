# How to destroy an installation

- [Destroy EKS cluster](#destroy-eks-cluster)
- [Destroy RDS](#destroy-rds)

## Destroy EKS cluster

`npx cdk destroy Workflows -c aws-account-id=[AWS_ACCOUNT_ID]`

## Destroy RDS

You need to destroy the EKS cluster prior to destroy the RDS stack.

From this repository:

`npx cdk destroy [ARGO_DB_STACK]`
