// scripts/setup.js - Initial setup script
const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function setupInitialInfrastructure() {
  const bigquery = new BigQuery();
  const secretManager = new SecretManagerServiceClient();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  console.log('Setting up initial infrastructure...');

  try {
    // Create datasets
    console.log('Creating BigQuery datasets...');
    
    const [stagingExists] = await bigquery.dataset('hr_staging').exists();
    if (!stagingExists) {
      await bigquery.createDataset('hr_staging', {
        location: 'US',
        description: 'Staging dataset for raw HR data'
      });
      console.log('Created hr_staging dataset');
    }

    const [warehouseExists] = await bigquery.dataset('hr_data_warehouse').exists();
    if (!warehouseExists) {
      await bigquery.createDataset('hr_data_warehouse', {
        location: 'US',
        description: 'Main HR data warehouse'
      });
      console.log('Created hr_data_warehouse dataset');
    }

    // Create initial secrets (placeholders)
    const secrets = [
      'garoon-api-key',
      'garoon-base-url',
      'smarthr-api-key',
      'smarthr-base-url',
      'jobcan-client-id',
      'jobcan-client-secret',
      'pca-api-key',
      'pca-company-code',
      'google-service-account'
    ];

    for (const secretId of secrets) {
      try {
        await secretManager.createSecret({
          parent: `projects/${projectId}`,
          secretId,
          secret: {
            replication: { automatic: {} }
          }
        });
        console.log(`Created secret: ${secretId}`);
      } catch (error) {
        if (error.code === 6) { // Already exists
          console.log(`Secret ${secretId} already exists`);
        } else {
          throw error;
        }
      }
    }

    console.log('Infrastructure setup completed successfully!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupInitialInfrastructure();
}

module.exports = { DataQualityMonitor, setupInitialInfrastructure };