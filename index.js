const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const bigquery = new BigQuery();
const secretClient = new SecretManagerServiceClient();

// Get secret from Secret Manager
async function getSecret(secretName) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js';
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString().trim();
  } catch (error) {
    console.error(`Error getting secret ${secretName}:`, error);
    return null;
  }
}

// Get current ETL state from BigQuery
async function getETLState() {
  try {
    const query = `
      SELECT current_offset, total_processed, has_more_data
      FROM \`jc-etl-js.hr_staging.etl_state\`
      WHERE process_name = 'garoon_workflow_sync'
      LIMIT 1
    `;
    const [rows] = await bigquery.query(query);
    
    if (rows.length === 0) {
      // Initialize if not exists
      return { current_offset: 0, total_processed: 0, has_more_data: true };
    }
    
    return {
      current_offset: parseInt(rows[0].current_offset),
      total_processed: parseInt(rows[0].total_processed),
      has_more_data: rows[0].has_more_data
    };
  } catch (error) {
    console.error('Error getting ETL state:', error);
    return { current_offset: 0, total_processed: 0, has_more_data: true };
  }
}

// Update ETL state in BigQuery
async function updateETLState(offset, totalProcessed, hasMoreData) {
  try {
    const query = `
      UPDATE \`jc-etl-js.hr_staging.etl_state\`
      SET 
        current_offset = ${offset},
        total_processed = ${totalProcessed},
        has_more_data = ${hasMoreData},
        last_updated = CURRENT_TIMESTAMP()
      WHERE process_name = 'garoon_workflow_sync'
    `;
    await bigquery.query(query);
    console.log(`Updated ETL state: offset=${offset}, total=${totalProcessed}, hasMore=${hasMoreData}`);
  } catch (error) {
    console.error('Error updating ETL state:', error);
  }
}

// Fetch data from Garoon API with resumable pagination
async function fetchGaroonData() {
  try {
    const authToken = await getSecret('cybozu-authorization');
    if (!authToken) {
      throw new Error('Cybozu authorization token not found');
    }

    // Get current state
    const state = await getETLState();
    
    if (!state.has_more_data) {
      console.log('No more data to fetch. ETL process is complete.');
      return { 
        requests: [], 
        hasMore: false, 
        nextOffset: state.current_offset,
        totalProcessed: state.total_processed 
      };
    }

    console.log(`Resuming from offset: ${state.current_offset}, total processed so far: ${state.total_processed}`);
    
    let allRequests = [];
    let offset = state.current_offset;
    let hasNext = true;
    const limit = 100; // API default limit per page
    const maxRecords = 1000; // Fetch 1000 records per run
    const maxPages = maxRecords / limit; // 10 pages
    let pageCount = 0;

    while (hasNext && pageCount < maxPages) {
      console.log(`Fetching page ${pageCount + 1}/${maxPages} with offset: ${offset}`);
      
      const url = `${process.env.GAROON_API_ENDPOINT}?offset=${offset}&limit=${limit}`;
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Cybozu-Authorization': authToken
        },
        timeout: 30000
      });

      const pageData = response.data;
      const requests = pageData.requests || [];
      
      if (requests.length === 0) {
        console.log('No more records returned from API');
        hasNext = false;
        break;
      }
      
      allRequests = allRequests.concat(requests);
      
      hasNext = pageData.hasNext || false;
      offset += limit;
      pageCount++;

      console.log(`Fetched ${requests.length} records, batch total: ${allRequests.length}, API hasNext: ${hasNext}`);
    }

    const newTotalProcessed = state.total_processed + allRequests.length;
    const stillHasMore = hasNext && pageCount >= maxPages;
    
    // Update state
    await updateETLState(offset, newTotalProcessed, stillHasMore);
    
    const message = stillHasMore ? 
      `Fetched ${allRequests.length} records. Total processed: ${newTotalProcessed}. More data available.` :
      `Fetched ${allRequests.length} records. Total processed: ${newTotalProcessed}. All data retrieved.`;
    
    console.log(message);
    return { 
      requests: allRequests, 
      hasMore: stillHasMore,
      nextOffset: offset,
      totalProcessed: newTotalProcessed
    };
  } catch (error) {
    console.error('Error fetching Garoon data:', error);
    throw error;
  }
}

// Transform Garoon data for BigQuery
function transformGaroonData(data) {
  if (!data.requests || !Array.isArray(data.requests)) {
    return [];
  }

  return data.requests.map(request => ({
    request_id: request.id,
    request_number: request.number,
    request_name: request.name,
    status: request.status?.name || null,
    status_type: request.status?.type || null,
    created_at: request.createdAt,
    processing_step_code: request.processingStepCode,
    is_urgent: request.isUrgent,
    applicant_id: request.applicant?.id || null,
    applicant_code: request.applicant?.code || null,
    applicant_name: request.applicant?.name || null,
    form_data: JSON.stringify(request.items || {}),
    steps_data: JSON.stringify(request.steps || {}),
    extracted_at: new Date().toISOString()
  }));
}

// ==================== SMARTHR FUNCTIONS ====================

// Get SmartHR ETL state
async function getSmartHRETLState() {
  try {
    const query = `
      SELECT current_offset, total_processed, has_more_data
      FROM \`jc-etl-js.hr_staging.etl_state\`
      WHERE process_name = 'smarthr_employee_sync'
      LIMIT 1
    `;
    const [rows] = await bigquery.query(query);
    
    if (rows.length === 0) {
      // Initialize if not exists
      const initQuery = `
        INSERT INTO \`jc-etl-js.hr_staging.etl_state\`
        (process_name, current_offset, total_processed, has_more_data, last_updated)
        VALUES ('smarthr_employee_sync', 0, 0, true, CURRENT_TIMESTAMP())
      `;
      await bigquery.query(initQuery);
      return { current_offset: 0, total_processed: 0, has_more_data: true };
    }
    
    return {
      current_offset: parseInt(rows[0].current_offset),
      total_processed: parseInt(rows[0].total_processed),
      has_more_data: rows[0].has_more_data
    };
  } catch (error) {
    console.error('Error getting SmartHR ETL state:', error);
    return { current_offset: 0, total_processed: 0, has_more_data: true };
  }
}

// Update SmartHR ETL state
async function updateSmartHRETLState(offset, totalProcessed, hasMoreData) {
  try {
    const query = `
      UPDATE \`jc-etl-js.hr_staging.etl_state\`
      SET 
        current_offset = ${offset},
        total_processed = ${totalProcessed},
        has_more_data = ${hasMoreData},
        last_updated = CURRENT_TIMESTAMP()
      WHERE process_name = 'smarthr_employee_sync'
    `;
    await bigquery.query(query);
    console.log(`Updated SmartHR ETL state: offset=${offset}, total=${totalProcessed}, hasMore=${hasMoreData}`);
  } catch (error) {
    console.error('Error updating SmartHR ETL state:', error);
  }
}

// Fetch data from SmartHR API
async function fetchSmartHRData() {
  try {
    const etlState = await getSmartHRETLState();
    
    if (!etlState.has_more_data) {
      console.log('SmartHR ETL already complete');
      return { 
        employees: [], 
        hasMore: false,
        nextOffset: etlState.current_offset,
        totalProcessed: etlState.total_processed
      };
    }

    const smarthrApiEndpoint = process.env.SMARTHR_BASE_URL;
    const smarthrAccessToken = process.env.SMARTHR_API_TOKEN;
    
    if (!smarthrApiEndpoint || !smarthrAccessToken) {
      throw new Error('SmartHR API endpoint or access token not found in environment variables');
    }

    const perPage = 100; // SmartHR's max per page
    const page = Math.floor(etlState.current_offset / perPage) + 1;

    console.log(`Fetching SmartHR employees - Page ${page} (offset: ${etlState.current_offset})`);

    const response = await fetch(`${smarthrApiEndpoint}/v1/crews?page=${page}&per_page=${perPage}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smarthrAccessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`SmartHR API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const employees = data || [];
    const hasNext = employees.length === perPage;
    const newOffset = etlState.current_offset + employees.length;
    const newTotalProcessed = etlState.total_processed + employees.length;

    // Update state
    await updateSmartHRETLState(newOffset, newTotalProcessed, hasNext);

    const message = hasNext ? 
      `Fetched ${employees.length} SmartHR employees. Total processed: ${newTotalProcessed}. More data available.` :
      `Fetched ${employees.length} SmartHR employees. Total processed: ${newTotalProcessed}. All data retrieved.`;

    console.log(message);
    return { 
      employees: employees, 
      hasMore: hasNext,
      nextOffset: newOffset,
      totalProcessed: newTotalProcessed
    };
  } catch (error) {
    console.error('Error fetching SmartHR data:', error);
    throw error;
  }
}

// Transform SmartHR data for BigQuery
function transformSmartHRData(data) {
  if (!data.employees || !Array.isArray(data.employees)) {
    return [];
  }

  return data.employees.map(employee => ({
    employee_id: employee.id,
    employee_number: employee.emp_code,
    email: employee.email,
    first_name: employee.first_name,
    last_name: employee.last_name,
    first_name_kana: employee.first_name_yomi,
    last_name_kana: employee.last_name_yomi,
    employment_type: employee.employment_type?.name || null,
    department_id: employee.department?.id || null,
    department_name: employee.department?.name || null,
    position: employee.position,
    hired_date: employee.entered_at,
    birth_date: employee.birth_at,
    gender: employee.gender,
    phone_number: employee.tel_number,
    zip_code: employee.address?.zip_code || null,
    address: employee.address ? JSON.stringify(employee.address) : null,
    status: employee.emp_status,
    created_at: employee.created_at,
    updated_at: employee.updated_at,
    extracted_at: new Date().toISOString()
  }));
}

// Load data to BigQuery using MERGE for upsert functionality (optimized for large datasets)
async function loadToBigQuery(data, tableName) {
  const datasetId = 'hr_staging';
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableName);

  // Define table schemas based on table name
  let tableSchema;
  
  if (tableName === 'raw_workflow_requests') {
    tableSchema = {
      fields: [
        { name: 'request_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'request_number', type: 'STRING' },
        { name: 'request_name', type: 'STRING' },
        { name: 'status', type: 'STRING' },
        { name: 'status_type', type: 'STRING' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'processing_step_code', type: 'STRING' },
        { name: 'is_urgent', type: 'BOOLEAN' },
        { name: 'applicant_id', type: 'STRING' },
        { name: 'applicant_code', type: 'STRING' },
        { name: 'applicant_name', type: 'STRING' },
        { name: 'form_data', type: 'JSON' },
        { name: 'steps_data', type: 'JSON' },
        { name: 'extracted_at', type: 'TIMESTAMP' }
      ]
    };
  } else if (tableName === 'smarthr_employees') {
    tableSchema = {
      fields: [
        { name: 'employee_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'employee_number', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'first_name', type: 'STRING' },
        { name: 'last_name', type: 'STRING' },
        { name: 'first_name_kana', type: 'STRING' },
        { name: 'last_name_kana', type: 'STRING' },
        { name: 'employment_type', type: 'STRING' },
        { name: 'department_id', type: 'STRING' },
        { name: 'department_name', type: 'STRING' },
        { name: 'position', type: 'STRING' },
        { name: 'hired_date', type: 'DATE' },
        { name: 'birth_date', type: 'DATE' },
        { name: 'gender', type: 'STRING' },
        { name: 'phone_number', type: 'STRING' },
        { name: 'zip_code', type: 'STRING' },
        { name: 'address', type: 'STRING' },
        { name: 'status', type: 'STRING' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
        { name: 'extracted_at', type: 'TIMESTAMP' }
      ]
    };
  } else {
    throw new Error(`Unknown table name: ${tableName}`);
  }

  try {
    await table.get({ autoCreate: true, schema: tableSchema });
  } catch (error) {
    console.error('Error creating/getting table:', error);
  }

  if (data.length === 0) {
    return 0;
  }

  // Process data in larger batches for efficiency
  const batchSize = 500;
  let totalProcessed = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}, records ${i + 1}-${Math.min(i + batchSize, data.length)}`);

    // Create a temporary table for this batch
    const tempTableName = `${tableName}_temp_${Date.now()}_${Math.floor(i / batchSize)}`;
    const tempTable = dataset.table(tempTableName);
    
    try {
      // Insert batch into temporary table
      await tempTable.get({ autoCreate: true, schema: tableSchema });
      await tempTable.insert(batch);
      console.log(`Inserted ${batch.length} rows into temporary table ${tempTableName}`);

      // Use MERGE to upsert batch
      let mergeQuery;
      
      if (tableName === 'raw_workflow_requests') {
        mergeQuery = `
          MERGE \`${datasetId}.${tableName}\` AS target
          USING \`${datasetId}.${tempTableName}\` AS source
          ON target.request_id = source.request_id
          WHEN MATCHED THEN
            UPDATE SET
              request_number = source.request_number,
              request_name = source.request_name,
              status = source.status,
              status_type = source.status_type,
              created_at = source.created_at,
              processing_step_code = source.processing_step_code,
              is_urgent = source.is_urgent,
              applicant_id = source.applicant_id,
              applicant_code = source.applicant_code,
              applicant_name = source.applicant_name,
              form_data = source.form_data,
              steps_data = source.steps_data,
              extracted_at = source.extracted_at
          WHEN NOT MATCHED THEN
            INSERT (
              request_id, request_number, request_name, status, status_type,
              created_at, processing_step_code, is_urgent, applicant_id,
              applicant_code, applicant_name, form_data, steps_data, extracted_at
            )
            VALUES (
              source.request_id, source.request_number, source.request_name,
              source.status, source.status_type, source.created_at,
              source.processing_step_code, source.is_urgent, source.applicant_id,
              source.applicant_code, source.applicant_name, source.form_data,
              source.steps_data, source.extracted_at
            )
        `;
      } else if (tableName === 'smarthr_employees') {
        mergeQuery = `
          MERGE \`${datasetId}.${tableName}\` AS target
          USING \`${datasetId}.${tempTableName}\` AS source
          ON target.employee_id = source.employee_id
          WHEN MATCHED THEN
            UPDATE SET
              employee_number = source.employee_number,
              email = source.email,
              first_name = source.first_name,
              last_name = source.last_name,
              first_name_kana = source.first_name_kana,
              last_name_kana = source.last_name_kana,
              employment_type = source.employment_type,
              department_id = source.department_id,
              department_name = source.department_name,
              position = source.position,
              hired_date = source.hired_date,
              birth_date = source.birth_date,
              gender = source.gender,
              phone_number = source.phone_number,
              zip_code = source.zip_code,
              address = source.address,
              status = source.status,
              created_at = source.created_at,
              updated_at = source.updated_at,
              extracted_at = source.extracted_at
          WHEN NOT MATCHED THEN
            INSERT (
              employee_id, employee_number, email, first_name, last_name,
              first_name_kana, last_name_kana, employment_type, department_id,
              department_name, position, hired_date, birth_date, gender,
              phone_number, zip_code, address, status, created_at, updated_at, extracted_at
            )
            VALUES (
              source.employee_id, source.employee_number, source.email,
              source.first_name, source.last_name, source.first_name_kana,
              source.last_name_kana, source.employment_type, source.department_id,
              source.department_name, source.position, source.hired_date,
              source.birth_date, source.gender, source.phone_number,
              source.zip_code, source.address, source.status, source.created_at,
              source.updated_at, source.extracted_at
            )
        `;
      }

      const [job] = await bigquery.createQueryJob({
        query: mergeQuery,
        location: 'US',
      });

      await job.getQueryResults();
      console.log(`MERGE operation completed for batch of ${batch.length} records`);

      // Clean up temporary table
      await tempTable.delete();
      console.log(`Deleted temporary table ${tempTableName}`);

      totalProcessed += batch.length;
    } catch (error) {
      console.error(`Error in batch processing:`, error);
      // Clean up temporary table if it exists
      try {
        await tempTable.delete();
      } catch (cleanupError) {
        console.error('Error cleaning up temporary table:', cleanupError);
      }
      throw error;
    }
  }

  return totalProcessed;
}

// Main ETL function
functions.http('runFullETL', async (req, res) => {
  try {
    const { source, target, test, reset } = req.body || {};
    
    console.log('ETL request:', { source, target, test, reset });

    // Reset functionality
    if (reset === true) {
      await updateETLState(0, 0, true);
      res.status(200).json({
        status: 'success',
        message: 'ETL state reset to beginning',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (source === 'garoon' && target === 'bigquery') {
      // Fetch data from Garoon
      const fetchResult = await fetchGaroonData();
      
      if (fetchResult.requests.length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'ETL process complete. No more data to process.',
          source: source,
          target: target,
          records_processed: 0,
          records_inserted: 0,
          total_processed: fetchResult.totalProcessed,
          has_more_data: false,
          timestamp: new Date().toISOString(),
          project: process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js'
        });
        return;
      }

      console.log(`Fetched ${fetchResult.requests.length} requests from Garoon`);

      // Transform data
      const transformedData = transformGaroonData({ requests: fetchResult.requests });
      console.log(`Transformed ${transformedData.length} records`);

      // Load to BigQuery
      const insertedRows = await loadToBigQuery(transformedData, 'raw_workflow_requests');

      res.status(200).json({
        status: 'success',
        message: fetchResult.hasMore ? 
          'ETL pipeline completed successfully. More data available - will continue on next run.' :
          'ETL pipeline completed successfully. All data processed.',
        source: source,
        target: target,
        records_processed: transformedData.length,
        records_inserted: insertedRows,
        total_processed: fetchResult.totalProcessed,
        has_more_data: fetchResult.hasMore,
        next_offset: fetchResult.nextOffset,
        timestamp: new Date().toISOString(),
        project: process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js'
      });
    } else if (source === 'smarthr' && target === 'bigquery') {
      // Fetch data from SmartHR
      const fetchResult = await fetchSmartHRData();
      
      if (fetchResult.employees.length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'SmartHR ETL process complete. No more data to process.',
          source: source,
          target: target,
          records_processed: 0,
          records_inserted: 0,
          total_processed: fetchResult.totalProcessed,
          has_more_data: false,
          timestamp: new Date().toISOString(),
          project: process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js'
        });
        return;
      }

      console.log(`Fetched ${fetchResult.employees.length} employees from SmartHR`);

      // Transform data
      const transformedData = transformSmartHRData({ employees: fetchResult.employees });
      console.log(`Transformed ${transformedData.length} employee records`);

      // Load to BigQuery
      const insertedRows = await loadToBigQuery(transformedData, 'smarthr_employees');

      res.status(200).json({
        status: 'success',
        message: fetchResult.hasMore ? 
          'SmartHR ETL pipeline completed successfully. More data available - will continue on next run.' :
          'SmartHR ETL pipeline completed successfully. All data processed.',
        source: source,
        target: target,
        records_processed: transformedData.length,
        records_inserted: insertedRows,
        total_processed: fetchResult.totalProcessed,
        has_more_data: fetchResult.hasMore,
        next_offset: fetchResult.nextOffset,
        timestamp: new Date().toISOString(),
        project: process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js'
      });
    } else {
      // Simple response for other combinations
      res.status(200).json({
        status: 'success',
        message: 'ETL function is working',
        timestamp: new Date().toISOString(),
        project: process.env.GOOGLE_CLOUD_PROJECT || 'jc-etl-js'
      });
    }
  } catch (error) {
    console.error('ETL Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook handler
functions.http('webhookHandler', (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic webhook handler
functions.http('webhookHandler', async (req, res) => {
  try {
    console.log('Webhook handler called');
    
    const result = {
      status: 'success',
      message: 'Webhook received',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
functions.http('healthCheck', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
