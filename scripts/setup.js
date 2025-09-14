// scripts/setup.js - Complete system setup
require('dotenv').config();
const { BigQuerySetup } = require('./createTables');
const { setupInitialInfrastructure } = require('../monitoring/alerting');

async function fullSetup() {
  console.log('🛠️ Starting complete system setup...');
  
  try {
    // Step 1: Setup infrastructure
    console.log('\n1️⃣ Setting up initial infrastructure...');
    await setupInitialInfrastructure();
    
    // Step 2: Create tables
    console.log('\n2️⃣ Creating BigQuery tables...');
    const bqSetup = new BigQuerySetup();
    await bqSetup.createAllTables();
    
    // Step 3: Insert sample data if requested
    const args = process.argv.slice(2);
    if (args.includes('--sample-data')) {
      console.log('\n3️⃣ Inserting sample data...');
      await bqSetup.insertSampleData();
    }
    
    console.log('\n✅ Complete system setup finished!');
    console.log('\nNext steps:');
    console.log('1. Add your API keys to Secret Manager');
    console.log('2. Run: npm run etl');
    console.log('3. Check: npm run quality-check');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  fullSetup();
}

module.exports = { fullSetup };