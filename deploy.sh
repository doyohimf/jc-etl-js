#!/bin/bash

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}

echo "Deploying HR ETL System to project: $PROJECT_ID"

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com \
  bigquery.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  --project=$PROJECT_ID

# Deploy Cloud Functions
echo "Deploying Cloud Functions..."
gcloud functions deploy runFullETL \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 540s \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --project=$PROJECT_ID \
  --region=$REGION

gcloud functions deploy webhookHandler \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256MB \
  --timeout 120s \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --project=$PROJECT_ID \
  --region=$REGION

# Create BigQuery datasets
echo "Creating BigQuery datasets..."
bq mk --dataset --location=US $PROJECT_ID:hr_staging
bq mk --dataset --location=US $PROJECT_ID:hr_data_warehouse

echo "Creating BigQuery tables..."
npm run setup-tables

echo "Deployment completed successfully!"
echo "ETL Function URL: $(gcloud functions describe runETL --region=$REGION --project=$PROJECT_ID --format='value(httpsTrigger.url)')"
echo "Webhook URL: $(gcloud functions describe webhookHandler --region=$REGION --project=$PROJECT_ID --format='value(httpsTrigger.url)')"