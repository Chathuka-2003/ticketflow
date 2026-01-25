#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " TicketFlow Local Kubernetes (Minikube) Deployment Script"
echo "============================================================"

if command -v minikube >/dev/null 2>&1; then
  if ! minikube status >/dev/null 2>&1; then
    echo "[1/4] Starting Minikube cluster..."
    minikube start --cpus=4 --memory=6144
  else
    echo "[1/4] Minikube cluster is already running."
  fi

  echo "[2/4] Loading local TicketFlow Docker images into Minikube..."
  for img in \
    ticketflow/auth-service:local \
    ticketflow/event-service:local \
    ticketflow/booking-service:local \
    ticketflow/payment-service:local \
    ticketflow/notification-service:local \
    ticketflow/api-gateway:local \
    ticketflow/frontend:local
  do
    minikube image load "${img}"
  done
fi

echo "[3/4] Applying Kubernetes manifests (k8s/00..06)..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml
kubectl apply -f k8s/03-infrastructure.yaml
kubectl apply -f k8s/04-microservices.yaml
kubectl apply -f k8s/05-hpa.yaml
kubectl apply -f k8s/06-ingress.yaml

echo "[4/4] Current Kubernetes Resources in namespace 'ticketflow':"
kubectl get pods,svc,hpa -n ticketflow
