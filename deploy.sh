#!/bin/bash

# エラー発生時にスクリプトを終了
set -e

echo "Starting deployment process..."

# .envファイルの読み込み
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# 必要な環境変数の確認
for var in "DIFY_API_KEY" "GCP_PROJECT_ID" "GCP_REGION" "SERVICE_NAME"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set"
        exit 1
    fi
done

# Docker Desktopが起動しているか確認
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# ビルドキャッシュのクリア（オプション）
echo "Cleaning up Docker build cache..."
docker buildx prune --force

# M1/M2 Mac用のビルド設定
echo "Setting up buildx for multi-platform build..."
docker buildx create --use --name multiplatform-builder || true
docker buildx inspect --bootstrap multiplatform-builder

# Dockerイメージのビルドとプッシュ（マルチプラットフォーム対応）
echo "Building and pushing multi-platform image..."
docker buildx build --platform linux/amd64 \
    --builder multiplatform-builder \
    -t gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} \
    --push \
    .

# Cloud Runへのデプロイ
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} \
    --platform managed \
    --region ${GCP_REGION} \
    --project ${GCP_PROJECT_ID} \
    --allow-unauthenticated \
    --set-env-vars="DIFY_API_KEY=${DIFY_API_KEY},DIFY_API_BASE_URL=${DIFY_API_BASE_URL}"

echo "✨ Deployment completed successfully!"
echo "Service URL: https://${SERVICE_NAME}-${GCP_PROJECT_ID}.${GCP_REGION}.run.app"