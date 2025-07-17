# `cloudflared`

Cloudflare provides Zero Trust Network (ZTN) access to the Argo Workflow service. `cloudflared` is the daemon that is part of Cloudflare's Tunnel feature.

All of the cloudflare configuration is managed by a web control pane [https://dash.teams.cloudflare.com](https://dash.teams.cloudflare.com).

## Tunnel configuration

The configuration for the Cloudflare Application and Tunnel is in a LINZ internal document.

## Upgrade container image

To make `cloudflared` container usable in our cluster, we need to publish it in AWS ECR to avoid issues with the Docker Hub.

To to a newer version of `cloudflared`:

1. Pull the `cloudflared` image from Docker Hub

   ```shell
   docker pull cloudflare/cloudflared:2025.6.1
   ```

2. Tag the image for AWS ECR

   ```shell
   docker tag cloudflare/cloudflared:2025.6.1 019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/cloudflared:2025.6.1
   ```

3. Login Docker to the AWS ECR

   ```shell
   aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 019359803926.dkr.ecr.ap-southeast-2.amazonaws.com
   ```

4. Push the image to ECR

   ```shell
   docker push 019359803926.dkr.ecr.ap-southeast-2.amazonaws.com/cloudflared:2025.6.1
   ```
