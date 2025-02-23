#!/bin/bash

# .envファイルの読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# 必要な環境変数の確認
if [ -z "$DIFY_API_KEY" ]; then
    echo "Error: DIFY_API_KEY is not set"
    exit 1
fi

if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID is not set"
    exit 1
fi

# Dockerイメージのビルドとタグ付け
docker build -t gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} .

# Google Container Registryにプッシュ
docker push gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME}

# Cloud Runへのデプロイ
gcloud run deploy ${SERVICE_NAME} \
    --image gcr.io/${GCP_PROJECT_ID}/${SERVICE_NAME} \
    --platform managed \
    --region ${GCP_REGION} \
    --project ${GCP_PROJECT_ID} \
    --allow-unauthenticated \
    --set-env-vars="DIFY_API_KEY=${DIFY_API_KEY},DIFY_API_BASE_URL=${DIFY_API_BASE_URL}"

echo "Deployment completed successfully!"