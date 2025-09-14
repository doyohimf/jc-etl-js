// schemas/tableSchemas.js
const tableSchemas = {
  // Staging tables - store raw data from each source
  garoon_raw_data: [
    { name: 'employee_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'last_name_kanji', type: 'STRING', mode: 'NULLABLE' },
    { name: 'first_name_kanji', type: 'STRING', mode: 'NULLABLE' },
    { name: 'email_address', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department_1', type: 'STRING', mode: 'NULLABLE' },
    { name: 'joining_date', type: 'STRING', mode: 'NULLABLE' },
    { name: 'work_hours', type: 'STRING', mode: 'NULLABLE' },
    { name: 'break_time', type: 'STRING', mode: 'NULLABLE' },
    { name: 'work_type', type: 'STRING', mode: 'NULLABLE' },
    { name: 'holidays', type: 'STRING', mode: 'NULLABLE' },
    { name: 'annual_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'fixed_monthly_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'fixed_premium_wage', type: 'STRING', mode: 'NULLABLE' },
    { name: 'employment_insurance', type: 'STRING', mode: 'NULLABLE' },
    { name: 'social_insurance', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
    { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'batch_id', type: 'STRING', mode: 'REQUIRED' }
  ],

  smarthr_raw_data: [
    { name: 'employee_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'last_name_katakana', type: 'STRING', mode: 'NULLABLE' },
    { name: 'first_name_katakana', type: 'STRING', mode: 'NULLABLE' },
    { name: 'personal_email', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department', type: 'STRING', mode: 'NULLABLE' },
    { name: 'joining_date', type: 'STRING', mode: 'NULLABLE' },
    { name: 'birth_date', type: 'STRING', mode: 'NULLABLE' },
    { name: 'gender', type: 'STRING', mode: 'NULLABLE' },
    { name: 'working_hours', type: 'STRING', mode: 'NULLABLE' },
    { name: 'break_time', type: 'STRING', mode: 'NULLABLE' },
    { name: 'work_type', type: 'STRING', mode: 'NULLABLE' },
    { name: 'annual_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'monthly_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'employment_insurance_status', type: 'STRING', mode: 'NULLABLE' },
    { name: 'social_insurance_status', type: 'STRING', mode: 'NULLABLE' },
    { name: 'spouse_info', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
    { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'batch_id', type: 'STRING', mode: 'REQUIRED' }
  ],

  jobcan_raw_data: [
    { name: 'employee_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'full_name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department', type: 'STRING', mode: 'NULLABLE' },
    { name: 'joining_date', type: 'STRING', mode: 'NULLABLE' },
    { name: 'work_schedule', type: 'STRING', mode: 'NULLABLE' },
    { name: 'hourly_wage', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
    { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'batch_id', type: 'STRING', mode: 'REQUIRED' }
  ],

  pca_raw_data: [
    { name: 'employee_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'full_name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department', type: 'STRING', mode: 'NULLABLE' },
    { name: 'position', type: 'STRING', mode: 'NULLABLE' },
    { name: 'basic_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'allowances', type: 'STRING', mode: 'NULLABLE' },
    { name: 'deductions', type: 'STRING', mode: 'NULLABLE' },
    { name: 'net_salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
    { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'batch_id', type: 'STRING', mode: 'REQUIRED' }
  ],

  sheets_raw_data: [
    { name: 'employee_code', type: 'STRING', mode: 'NULLABLE' },
    { name: 'name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department', type: 'STRING', mode: 'NULLABLE' },
    { name: 'position', type: 'STRING', mode: 'NULLABLE' },
    { name: 'hire_date', type: 'STRING', mode: 'NULLABLE' },
    { name: 'salary', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source', type: 'STRING', mode: 'REQUIRED' },
    { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'batch_id', type: 'STRING', mode: 'REQUIRED' }
  ],

  // Main warehouse table - unified employee data
  employees_unified: [
    { name: 'employee_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'first_name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'last_name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'full_name', type: 'STRING', mode: 'NULLABLE' },
    { name: 'email', type: 'STRING', mode: 'NULLABLE' },
    { name: 'department', type: 'STRING', mode: 'NULLABLE' },
    { name: 'position', type: 'STRING', mode: 'NULLABLE' },
    { name: 'hire_date', type: 'DATE', mode: 'NULLABLE' },
    { name: 'birth_date', type: 'DATE', mode: 'NULLABLE' },
    { name: 'gender', type: 'STRING', mode: 'NULLABLE' },
    { name: 'employment_type', type: 'STRING', mode: 'NULLABLE' },
    { name: 'working_hours', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'break_time', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'annual_salary', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'monthly_salary', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'hourly_wage', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'basic_salary', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'allowances', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'deductions', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'fixed_premium_wage', type: 'NUMERIC', mode: 'NULLABLE' },
    { name: 'employment_insurance', type: 'STRING', mode: 'NULLABLE' },
    { name: 'social_insurance', type: 'STRING', mode: 'NULLABLE' },
    { name: 'spouse_info', type: 'STRING', mode: 'NULLABLE' },
    { name: 'work_schedule', type: 'STRING', mode: 'NULLABLE' },
    { name: 'holidays', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source_system', type: 'STRING', mode: 'REQUIRED' },
    { name: 'source_systems', type: 'STRING', mode: 'NULLABLE' },
    { name: 'processed_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'record_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'data_version', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'merged_records_count', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'is_active', type: 'BOOLEAN', mode: 'NULLABLE', defaultValueExpression: 'true' }
  ],

  // ETL execution log table
  etl_execution_log: [
    { name: 'execution_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'start_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'end_time', type: 'TIMESTAMP', mode: 'NULLABLE' },
    { name: 'duration_ms', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'success', type: 'BOOLEAN', mode: 'REQUIRED' },
    { name: 'records_processed', type: 'JSON', mode: 'NULLABLE' },
    { name: 'errors', type: 'JSON', mode: 'NULLABLE' },
    { name: 'data_quality', type: 'JSON', mode: 'NULLABLE' }
  ],

  // Data quality alerts table
  data_quality_alerts: [
    { name: 'alert_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'alert_type', type: 'STRING', mode: 'REQUIRED' },
    { name: 'severity', type: 'STRING', mode: 'REQUIRED' },
    { name: 'message', type: 'STRING', mode: 'REQUIRED' },
    { name: 'source_system', type: 'STRING', mode: 'NULLABLE' },
    { name: 'metric_value', type: 'FLOAT', mode: 'NULLABLE' }
  ]
};

module.exports = { tableSchemas };