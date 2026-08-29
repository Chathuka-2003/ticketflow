#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-north-1}"

echo "============================================================"
echo " TicketFlow AWS EKS + RDS + ElastiCache Teardown Script"
echo "============================================================"

if command -v kubectl >/dev/null 2>&1; then
  echo "[1/2] Deleting Kubernetes LoadBalancer & Ingress resources..."
  kubectl delete -f k8s/06-ingress.yaml --ignore-not-found || true
  kubectl delete -f k8s/04-microservices.yaml --ignore-not-found || true
fi

echo "[2/2] Running terraform destroy in ./terraform..."
cd terraform
terraform destroy -auto-approve -var="aws_region=${AWS_REGION}"
echo "============================================================"
echo " All AWS resources destroyed cleanly!"
echo "============================================================"
