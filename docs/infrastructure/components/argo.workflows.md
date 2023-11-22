# Argo Workflows

Argo Workflows is used to run the workflows inside K8s.
It is deployed using its [Helm chart](https://github.com/argoproj/argo-helm/tree/main/charts/argo-workflows).
An AWS RDS PostgreSQL database instance is used to provide persistent storage for the Archived Workflows feature.
