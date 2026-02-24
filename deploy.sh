#!/bin/bash
set -euo pipefail

# ============================================================
# Cloud Run Deployment Script for screening-api
# ============================================================
# Usage:
#   ./deploy.sh                          # Deploy with defaults
#   ./deploy.sh --project my-project     # Specify project
#   ./deploy.sh --region us-east1        # Specify region
# ============================================================

# Defaults (override via flags or environment variables)
PROJECT_ID="${GCP_PROJECT_ID:-trustcredo}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="screening-api"
REPOSITORY="screening"
SCREENING_BACKEND="${SCREENING_BACKEND:-hosted}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --service) SERVICE_NAME="$2"; shift 2 ;;
    --backend) SCREENING_BACKEND="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: No project ID specified. Use --project or set GCP_PROJECT_ID"
    exit 1
  fi
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"
TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "============================================"
echo "  Deploying ${SERVICE_NAME}"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Image:    ${IMAGE_URI}:${TAG}"
echo "  Backend:  ${SCREENING_BACKEND}"
echo "============================================"

# Step 1: Ensure Artifact Registry repository exists
echo ""
echo "[1/4] Ensuring Artifact Registry repository..."
gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID" \
  --description="Screening API Docker images"

# Step 2: Build and push Docker image
echo ""
echo "[2/4] Building and pushing Docker image..."
gcloud builds submit \
  --tag "${IMAGE_URI}:${TAG}" \
  --project="$PROJECT_ID" \
  .

# Step 3: Deploy to Cloud Run
echo ""
echo "[3/4] Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "${IMAGE_URI}:${TAG}" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --platform managed \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60s \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production,SCREENING_BACKEND=${SCREENING_BACKEND}" \
  --set-secrets "DATABASE_URL=screening-database-url:latest,DIRECT_URL=screening-direct-url:latest,OPENSANCTIONS_API_KEY=screening-opensanctions-key:latest,COVE_WEBHOOK_URL=screening-cove-webhook-url:latest,COVE_WEBHOOK_API_KEY=screening-cove-webhook-key:latest" \
  --allow-unauthenticated

# Step 4: Show service URL
echo ""
echo "[4/4] Deployment complete!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo ""
echo "============================================"
echo "  Service URL: ${SERVICE_URL}"
echo "  Health check: ${SERVICE_URL}/healthz"
echo "============================================"
