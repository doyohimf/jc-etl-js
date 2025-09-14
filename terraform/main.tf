terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40" # modern provider
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------
# Variables
# -----------------------
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Default region for regional resources"
  type        = string
  default     = "asia-southeast1"
}

variable "dataset_location" {
  description = "BigQuery dataset location (e.g., asia-southeast1 or US)"
  type        = string
  default     = "asia-southeast1"
}

variable "time_zone" {
  description = "Cloud Scheduler time zone, e.g. Asia/Manila or Asia/Tokyo"
  type        = string
  default     = "Asia/Manila"
}

# Provide secrets via TF variables or set them later from console/CLI
variable "garoon_api_key_value" {
  description = "Garoon API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smarthr_api_key_value" {
  description = "SmartHR API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_service_account_json" {
  description = "Optional service account JSON (if your app needs to impersonate)"
  type        = string
  sensitive   = true
  default     = ""
}

# -----------------------
# Service Account for Cloud Functions
# -----------------------
resource "google_service_account" "functions_sa" {
  account_id   = "etl-functions-sa"
  display_name = "ETL Cloud Functions SA"
}

# Minimal IAM for the functions SA
resource "google_project_iam_member" "bq_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.functions_sa.email}"
}

resource "google_project_iam_member" "bq_data_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.functions_sa.email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.functions_sa.email}"
}

resource "google_project_iam_member" "pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.functions_sa.email}"
}

# -----------------------
# BigQuery Datasets
# -----------------------
resource "google_bigquery_dataset" "staging" {
  dataset_id                 = "hr_staging"
  location                   = var.dataset_location
  description                = "Staging dataset for raw ETL data"
  delete_contents_on_destroy = false
}

resource "google_bigquery_dataset" "warehouse" {
  dataset_id                 = "hr_data_warehouse"
  location                   = var.dataset_location
  description                = "Main data warehouse for HR analytics"
  delete_contents_on_destroy = false
}

# -----------------------
# Secret Manager
# -----------------------
resource "google_secret_manager_secret" "garoon_api_key" {
  secret_id  = "garoon-api-key"
  replication { automatic = true }
}

resource "google_secret_manager_secret_version" "garoon_api_key_v1" {
  count    = var.garoon_api_key_value == "" ? 0 : 1
  secret   = google_secret_manager_secret.garoon_api_key.id
  secret_data = var.garoon_api_key_value
}

resource "google_secret_manager_secret" "smarthr_api_key" {
  secret_id  = "smarthr-api-key"
  replication { automatic = true }
}

resource "google_secret_manager_secret_version" "smarthr_api_key_v1" {
  count    = var.smarthr_api_key_value == "" ? 0 : 1
  secret   = google_secret_manager_secret.smarthr_api_key.id
  secret_data = var.smarthr_api_key_value
}

resource "google_secret_manager_secret" "google_service_account" {
  secret_id  = "google-service-account"
  replication { automatic = true }
}

resource "google_secret_manager_secret_version" "google_service_account_v1" {
  count       = var.google_service_account_json == "" ? 0 : 1
  secret      = google_secret_manager_secret.google_service_account.id
  secret_data = var.google_service_account_json
}

# Grant the Functions SA access to these specific secrets (belt & suspenders)
resource "google_secret_manager_secret_iam_member" "garoon_accessor" {
  secret_id = google_secret_manager_secret.garoon_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.functions_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "smarthr_accessor" {
  secret_id = google_secret_manager_secret.smarthr_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.functions_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "gsa_accessor" {
  secret_id = google_secret_manager_secret.google_service_account.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.functions_sa.email}"
}

# -----------------------
# Pub/Sub + Scheduler (no public HTTP)
# -----------------------
resource "google_pubsub_topic" "etl_topic" {
  name = "hr-etl-topic"
}

# Let Cloud Scheduler publish to the topic
resource "google_project_iam_member" "scheduler_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

data "google_project" "project" {}

# Cloud Scheduler job that publishes a message daily
resource "google_cloud_scheduler_job" "etl_schedule" {
  name        = "hr-etl-daily"
  description = "Daily HR ETL process"
  schedule    = "0 6 * * *" # 06:00 daily
  time_zone   = var.time_zone

  pubsub_target {
    topic_name = google_pubsub_topic.etl_topic.id
    data       = base64encode("{\"action\":\"runETL\"}")
  }
}

# -----------------------
# Outputs (useful in Cloud Build or for sanity-check)
# -----------------------
output "functions_service_account_email" {
  value = google_service_account.functions_sa.email
}

output "etl_topic" {
  value = google_pubsub_topic.etl_topic.name
}
