// scripts/healthCheck.js - System health checker  
require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function runHealthCheck() {
  console.log('🏥 Running system health check...');
  
  const checks = {
    bigquery: { status: 'unknown', message: '' },
    secretManager: { status: 'unknown', message: '' },
    datasets: { status: 'unknown', message: '' },
    tables: { status: 'unknown', message: '' }
  };

  // Check BigQuery connectivity
  try {
    const bigquery = new BigQuery();
    await bigquery.getDatasets();
    checks.bigquery = { status: 'healthy', message: 'Connected successfully' };
  } catch (error) {
    checks.bigquery = { status: 'unhealthy', message: error.message };
  }

  // Check Secret Manager
  try {
    const secretManager = new SecretManagerServiceClient();
    await secretManager.listSecrets({
      parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT}`
    });
    checks.secretManager = { status: 'healthy', message: 'Connected successfully' };
  } catch (error) {
    checks.secretManager = { status: 'unhealthy', message: error.message };
  }

  // Check required datasets exist
  try {
    const bigquery = new BigQuery();
    const [stagingExists] = await bigquery.dataset('hr_staging').exists();
    const [warehouseExists] = await bigquery.dataset('hr_data_warehouse').exists();
    
    if (stagingExists && warehouseExists) {
      checks.datasets = { status: 'healthy', message: 'All datasets exist' };
    } else {
      checks.datasets = { 
        status: 'unhealthy', 
        message: `Missing datasets - staging: ${stagingExists}, warehouse: ${warehouseExists}` 
      };
    }
  } catch (error) {
    checks.datasets = { status: 'unhealthy', message: error.message };
  }

  // Check required tables exist
  try {
    const bigquery = new BigQuery();
    const table = bigquery.dataset('hr_data_warehouse').table('employees_unified');
    const [exists] = await table.exists();
    
    if (exists) {
      checks.tables = { status: 'healthy', message: 'Main tables exist' };
    } else {
      checks.tables = { status: 'unhealthy', message: 'employees_unified table missing' };
    }
  } catch (error) {
    checks.tables = { status: 'unhealthy', message: error.message };
  }

  // Display results
  console.log('\n📋 Health Check Results:');
  let overallHealthy = true;
  
  for (const [component, check] of Object.entries(checks)) {
    const icon = check.status === 'healthy' ? '✅' : '❌';
    console.log(`  ${icon} ${component}: ${check.status} - ${check.message}`);
    if (check.status !== 'healthy') overallHealthy = false;
  }

  console.log(`\n🏥 Overall System Health: ${overallHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  
  process.exit(overallHealthy ? 0 : 1);
}

if (require.main === module) {
  runHealthCheck();
}

module.exports = { runHealthCheck };