// scripts/dataQualityCheck.js - Data quality checker
require('dotenv').config();
const { DataQualityMonitor } = require('../monitoring/alerting');

async function runQualityCheck() {
  console.log('🔍 Running data quality checks...');
  
  try {
    const monitor = new DataQualityMonitor();
    const results = await monitor.runAllChecks();
    
    console.log('\n📈 Data Quality Report:');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Alerts found: ${results.alerts_count}`);
    
    if (results.alerts_count === 0) {
      console.log('✅ All data quality checks passed!');
    } else {
      console.log('\n⚠️ Quality Issues Found:');
      results.alerts.forEach(alert => {
        const icon = alert.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${alert.type}: ${alert.message}`);
      });
    }
    
    process.exit(results.alerts_count > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Quality check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runQualityCheck();
}

module.exports = { runQualityCheck };