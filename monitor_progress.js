#!/usr/bin/env node

const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();

async function checkProgress() {
  try {
    console.log('\n🏢 Multi-Source ETL Progress Report');
    console.log('=====================================');
    
    // Get all ETL states
    const stateQuery = `
      SELECT 
        process_name,
        current_offset, 
        total_processed, 
        has_more_data,
        last_updated
      FROM \`jc-etl-js.hr_staging.etl_state\`
      ORDER BY process_name
    `;
    
    // Get record counts for all tables
    const garoonCountQuery = `
      SELECT COUNT(DISTINCT request_id) as total_records
      FROM \`jc-etl-js.hr_staging.raw_workflow_requests\`
    `;
    
    const smarthrCountQuery = `
      SELECT COUNT(DISTINCT employee_id) as total_records
      FROM \`jc-etl-js.hr_staging.smarthr_employees\`
    `;

    const [stateRows] = await bigquery.query(stateQuery);
    const [garoonCountRows] = await bigquery.query(garoonCountQuery);
    const [smarthrCountRows] = await bigquery.query(smarthrCountQuery);

    const garoonTotal = garoonCountRows[0].total_records;
    const smarthrTotal = smarthrCountRows[0].total_records;

    console.log(`🕐 Last Updated: ${new Date().toLocaleString()}\n`);

    // Display each ETL process
    stateRows.forEach(state => {
      const processName = state.process_name;
      let displayName, tableName, recordCount;
      
      if (processName === 'garoon_workflow_sync') {
        displayName = '🔄 Garoon Workflow Data';
        tableName = 'raw_workflow_requests';
        recordCount = garoonTotal;
      } else if (processName === 'smarthr_employee_sync') {
        displayName = '👥 SmartHR Employee Data';
        tableName = 'smarthr_employees';
        recordCount = smarthrTotal;
      } else {
        displayName = `📊 ${processName}`;
        recordCount = 'Unknown';
      }

      console.log(displayName);
      console.log('─'.repeat(40));
      console.log(`📍 Next Batch Offset: ${state.current_offset.toLocaleString()}`);
      console.log(`📈 API Records Processed: ${state.total_processed.toLocaleString()}`);
      console.log(`💾 Records in BigQuery: ${recordCount.toLocaleString()}`);
      console.log(`🔄 More Data Available: ${state.has_more_data ? '✅ Yes' : '❌ No'}`);
      console.log(`🕐 Last Updated: ${state.last_updated}`);
      
      if (!state.has_more_data) {
        console.log(`🎉 ${displayName} COMPLETE!`);
      }
      console.log('');
    });

    // Summary
    const totalSources = stateRows.length;
    const completedSources = stateRows.filter(s => !s.has_more_data).length;
    
    console.log('📊 Overall Summary');
    console.log('==================');
    console.log(`📈 Total Data Sources: ${totalSources}`);
    console.log(`✅ Completed Sources: ${completedSources}`);
    console.log(`⏳ Active Sources: ${totalSources - completedSources}`);
    console.log(`🏢 Garoon Workflow Records: ${garoonTotal.toLocaleString()}`);
    console.log(`👥 SmartHR Employee Records: ${smarthrTotal.toLocaleString()}`);
    console.log(`📊 Total Records Collected: ${(parseInt(garoonTotal) + parseInt(smarthrTotal)).toLocaleString()}`);

    if (completedSources === totalSources) {
      console.log('\n🎉🎉🎉 ALL ETL PROCESSES COMPLETE! 🎉🎉🎉');
      console.log('All data sources have been successfully synchronized!');
    } else {
      console.log('\n⚡ Some ETL processes are still running...');
    }

  } catch (error) {
    console.error('❌ Error checking progress:', error.message);
  }
}

// Run the progress check
checkProgress();
