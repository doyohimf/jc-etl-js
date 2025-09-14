
// scripts/runETL.js - Main ETL runner script
require('dotenv').config();
const { EnhancedETLOrchestrator } = require('../index');

async function runETL() {
  const args = process.argv.slice(2);
  const isIncremental = args.includes('--incremental');
  const isFull = args.includes('--full') || args.length === 0;

  console.log('🚀 Starting ETL process...');
  console.log(`Mode: ${isIncremental ? 'Incremental' : 'Full'}`);
  
  try {
    const orchestrator = new EnhancedETLOrchestrator();
    
    if (isIncremental) {
      // For incremental, you'd need to pass specific data
      console.log('❌ Incremental mode requires webhook data');
      console.log('Use: npm run etl -- --full  or just: npm run etl');
      process.exit(1);
    } else {
      const result = await orchestrator.runFullETL();
      
      console.log('\n📊 ETL Results:');
      console.log(`Success: ${result.success ? '✅' : '❌'}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log('Records processed:', result.recordsProcessed);
      
      if (result.errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (result.success) {
        console.log('\n✅ ETL completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ ETL completed with errors');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('💥 ETL failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runETL();
}

module.exports = { runETL };