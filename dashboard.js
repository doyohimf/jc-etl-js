#!/usr/bin/env node

const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();

async function showDashboard() {
  try {
    console.clear();
    console.log('🔄 Garoon ETL Dashboard - Auto Refresh Every 30 seconds');
    console.log('=========================================================');
    console.log(`⏰ Last Updated: ${new Date().toLocaleString()}`);
    
    // Get ETL state
    const stateQuery = `
      SELECT 
        current_offset, 
        total_processed, 
        has_more_data,
        last_updated
      FROM \`jc-etl-js.hr_staging.etl_state\`
      WHERE process_name = 'garoon_workflow_sync'
    `;
    
    // Get total unique records in BigQuery
    const countQuery = `
      SELECT COUNT(DISTINCT request_id) as unique_records
      FROM \`jc-etl-js.hr_staging.raw_workflow_requests\`
    `;

    const [stateRows] = await bigquery.query(stateQuery);
    const [countRows] = await bigquery.query(countQuery);

    if (stateRows.length === 0) {
      console.log('❌ No ETL state found');
      return;
    }

    const state = stateRows[0];
    const uniqueRecords = countRows[0].unique_records;

    console.log('\n📊 Current Status:');
    console.log(`   📍 Next Batch Offset: ${state.current_offset.toLocaleString()}`);
    console.log(`   📈 API Records Processed: ${state.total_processed.toLocaleString()}`);
    console.log(`   💾 Unique Records in BigQuery: ${uniqueRecords.toLocaleString()}`);
    console.log(`   🔄 More Data Available: ${state.has_more_data ? '✅ Yes' : '❌ No'}`);
    console.log(`   🕐 State Last Updated: ${state.last_updated}`);
    
    if (!state.has_more_data) {
      console.log('\n🎉 🎉 🎉 ETL COMPLETE! 🎉 🎉 🎉');
      console.log('All Garoon workflow data has been successfully extracted!');
      
      // Check scheduler status
      const { exec } = require('child_process');
      exec('gcloud scheduler jobs describe garoon-etl-scheduler --location="asia-northeast1" --format="value(state)"', (error, stdout) => {
        if (!error && stdout.trim() === 'ENABLED') {
          console.log('\n💡 Recommendation: You can now pause the scheduler:');
          console.log('   gcloud scheduler jobs pause garoon-etl-scheduler --location="asia-northeast1"');
        }
      });
    } else {
      console.log('\n⚡ Scheduler Status: Running every 5 minutes');
      console.log('   ⏱️  Next estimated run: Within 5 minutes');
      console.log('   📦 Batch size: 1000 records per run');
      
      // Estimate completion time
      const recordsPerBatch = 1000;
      const batchInterval = 5; // minutes
      const estimatedRemainingBatches = Math.ceil((state.current_offset - state.total_processed) / recordsPerBatch);
      const estimatedMinutes = estimatedRemainingBatches * batchInterval;
      
      if (estimatedMinutes > 0) {
        console.log(`   ⏳ Estimated completion: ~${Math.ceil(estimatedMinutes / 60)} hours`);
      }
    }

    // Show recent scheduler activity
    console.log('\n📋 Instructions:');
    console.log('   • Press Ctrl+C to stop monitoring');
    console.log('   • Run "node monitor_progress.js" for a one-time status check');
    console.log('   • Check scheduler logs: gcloud logging read "resource.type=cloud_function"');
    
  } catch (error) {
    console.error('❌ Error in dashboard:', error.message);
  }
}

// Auto-refresh dashboard
async function startDashboard() {
  await showDashboard();
  
  // Continue refreshing every 30 seconds
  setInterval(async () => {
    await showDashboard();
  }, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Dashboard stopped. ETL scheduler continues running in the background.');
  console.log('💡 To pause the scheduler: gcloud scheduler jobs pause garoon-etl-scheduler --location="asia-northeast1"');
  process.exit(0);
});

console.log('🚀 Starting Garoon ETL Dashboard...\n');
startDashboard();
