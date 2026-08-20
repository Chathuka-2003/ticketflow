#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-north-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "============================================================"
echo " TicketFlow AWS EKS + RDS + ElastiCache + ECR Deployment"
echo " Account : ${AWS_ACCOUNT_ID} | Region : ${AWS_REGION}"
echo "============================================================"

echo "[1/5] Initializing & Validating Terraform in ./terraform..."
cd terraform
terraform init
terraform validate

echo "[2/5] Provisioning AWS Infrastructure (VPC, ECR, RDS Postgres 16, ElastiCache Redis 7, EKS 1.31)..."
terraform apply -auto-approve \
  -var="aws_region=${AWS_REGION}"

EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
RDS_ENDPOINT=$(terraform output -raw rds_postgres_endpoint)
REDIS_ENDPOINT=$(terraform output -raw elasticache_redis_endpoint)
cd ..

echo "  -> EKS Cluster  : ${EKS_CLUSTER_NAME}"
echo "  -> RDS Endpoint : ${RDS_ENDPOINT}"
echo "  -> Redis Host   : ${REDIS_ENDPOINT}"

echo "[3/5] Authenticating Docker with Amazon ECR (${ECR_REGISTRY})..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

SERVICES=(
  "frontend"
  "api-gateway"
  "auth-service"
  "event-service"
  "booking-service"
  "payment-service"
  "notification-service"
)

echo "[4/5] Tagging & Pushing all 7 TicketFlow Docker images to Amazon ECR..."
for svc in "${SERVICES[@]}"; do
  docker tag "ticketflow/${svc}:local" "${ECR_REGISTRY}/ticketflow/${svc}:latest"
  docker push "${ECR_REGISTRY}/ticketflow/${svc}:latest"
done

echo "[5/5] Updating kubeconfig & Deploying TicketFlow to Amazon EKS..."
aws eks update-kubeconfig --region "${AWS_REGION}" --name "${EKS_CLUSTER_NAME}"

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml

# Patch ConfigMap to use AWS ElastiCache Redis endpoint
kubectl patch configmap ticketflow-config -n ticketflow \
  --type merge \
  -p "{\"data\":{\"REDIS_HOST\":\"${REDIS_ENDPOINT}\"}}"

# Deploy microservices using ECR images and RDS endpoint
sed -e "s|ticketflow/\(.*\):local|${ECR_REGISTRY}/ticketflow/\1:latest|g" \
    -e "s|postgres:5432|${RDS_ENDPOINT}|g" \
    k8s/04-microservices.yaml | kubectl apply -f -

kubectl apply -f k8s/05-hpa.yaml
kubectl apply -f k8s/06-ingress.yaml

echo "============================================================"
echo " AWS EKS Deployment Complete!"
kubectl get pods,svc,hpa -n ticketflow
echo "============================================================"
