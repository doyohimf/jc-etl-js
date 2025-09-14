// scripts/resetData.js - Reset/clean data for fresh start
require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');

async function resetData() {
  const args = process.argv.slice(2);
  const confirmReset = args.includes('--confirm');
  
  if (!confirmReset) {
    console.log('⚠️ This will delete all data in the ETL system!');
    console.log('To confirm, run: npm run reset-data -- --confirm');
    return;
  }
  
  console.log('🧹 Resetting ETL data...');
  
  try {
    const bigquery = new BigQuery();
    
    // Clear staging tables
    const stagingTables = [
      'garoon_raw_data',
      'smarthr_raw_data', 
      'jobcan_raw_data',
      'pca_raw_data',
      'sheets_raw_data'
    ];
    
    for (const tableName of stagingTables) {
      try {
        const query = `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_staging.${tableName}\` WHERE TRUE`;
        await bigquery.query(query);
        console.log(`  ✅ Cleared ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ ${tableName} - ${error.message}`);
      }
    }
    
    // Clear warehouse tables
    const warehouseTables = [
      'employees_unified',
      'etl_execution_log',
      'data_quality_alerts'
    ];
    
    for (const tableName of warehouseTables) {
      try {
        const query = `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_data_warehouse.${tableName}\` WHERE TRUE`;
        await bigquery.query(query);
        console.log(`  ✅ Cleared ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ ${tableName} - ${error.message}`);
      }
    }
    
    console.log('\n✅ Data reset completed!');
    
  } catch (error) {
    console.error('💥 Reset failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  resetData();
}

module.exports = { resetData };