// scripts/createTables.js
const { BigQuery } = require('@google-cloud/bigquery');
const { tableSchemas } = require('../schemas/tableSchemas');

class BigQuerySetup {
  constructor() {
    this.bigquery = new BigQuery();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.stagingDataset = 'hr_staging';
    this.warehouseDataset = 'hr_data_warehouse';
  }

  async createAllTables() {
    console.log('🚀 Starting BigQuery table creation...');
    
    try {
      // Create datasets if they don't exist
      await this.ensureDatasetsExist();
      
      // Create staging tables
      await this.createStagingTables();
      
      // Create warehouse tables
      await this.createWarehouseTables();
      
      // Create views
      await this.createViews();
      
      console.log('✅ All tables and views created successfully!');
      
      // Show created tables
      await this.listAllTables();
      
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  async ensureDatasetsExist() {
    console.log('📁 Ensuring datasets exist...');
    
    // Create staging dataset
    try {
      const [stagingExists] = await this.bigquery.dataset(this.stagingDataset).exists();
      if (!stagingExists) {
        await this.bigquery.createDataset(this.stagingDataset, {
          location: 'US',
          description: 'Staging dataset for raw HR data from various sources'
        });
        console.log(`  ✓ Created dataset: ${this.stagingDataset}`);
      } else {
        console.log(`  ✓ Dataset exists: ${this.stagingDataset}`);
      }
    } catch (error) {
      console.error(`Error with staging dataset: ${error.message}`);
    }

    // Create warehouse dataset
    try {
      const [warehouseExists] = await this.bigquery.dataset(this.warehouseDataset).exists();
      if (!warehouseExists) {
        await this.bigquery.createDataset(this.warehouseDataset, {
          location: 'US',
          description: 'Main HR data warehouse with cleaned and unified data'
        });
        console.log(`  ✓ Created dataset: ${this.warehouseDataset}`);
      } else {
        console.log(`  ✓ Dataset exists: ${this.warehouseDataset}`);
      }
    } catch (error) {
      console.error(`Error with warehouse dataset: ${error.message}`);
    }
  }

  async createStagingTables() {
    console.log('📊 Creating staging tables...');
    
    const stagingTables = [
      'garoon_raw_data',
      'smarthr_raw_data', 
      'jobcan_raw_data',
      'pca_raw_data',
      'sheets_raw_data'
    ];

    for (const tableName of stagingTables) {
      await this.createTable(this.stagingDataset, tableName, tableSchemas[tableName]);
    }
  }

  async createWarehouseTables() {
    console.log('🏭 Creating warehouse tables...');
    
    const warehouseTables = [
      'employees_unified',
      'etl_execution_log',
      'data_quality_alerts'
    ];

    for (const tableName of warehouseTables) {
      await this.createTable(this.warehouseDataset, tableName, tableSchemas[tableName]);
    }
  }

  async createTable(datasetId, tableName, schema) {
    try {
      const dataset = this.bigquery.dataset(datasetId);
      const table = dataset.table(tableName);
      
      const [exists] = await table.exists();
      if (exists) {
        console.log(`  ⚠️  Table already exists: ${datasetId}.${tableName}`);
        return;
      }

      const options = {
        schema: { fields: schema }
      };

      // Add partitioning for large tables
      if (tableName === 'employees_unified') {
        options.timePartitioning = {
          type: 'DAY',
          field: 'processed_at'
        };
      }

      if (tableName.includes('raw_data')) {
        options.timePartitioning = {
          type: 'DAY', 
          field: 'ingestion_timestamp'
        };
      }

      await table.create(options);
      console.log(`  ✅ Created table: ${datasetId}.${tableName} (${schema.length} columns)`);
      
    } catch (error) {
      console.error(`  ❌ Error creating table ${datasetId}.${tableName}:`, error.message);
    }
  }

  async createViews() {
    console.log('👁️  Creating views...');
    
    const views = [
      {
        name: 'employee_summary',
        query: `
          SELECT 
            employee_id,
            COALESCE(
              CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, '')),
              full_name
            ) as display_name,
            first_name,
            last_name,
            email,
            department,
            position,
            hire_date,
            employment_type,
            COALESCE(annual_salary, monthly_salary * 12) as estimated_annual_salary,
            monthly_salary,
            hourly_wage,
            working_hours,
            source_system,
            source_systems,
            processed_at,
            is_active
          FROM \`${this.projectId}.${this.warehouseDataset}.employees_unified\`
          WHERE is_active = true
        `
      },
      {
        name: 'department_summary', 
        query: `
          SELECT 
            department,
            COUNT(*) as total_employees,
            COUNT(CASE WHEN employment_type = 'full-time' THEN 1 END) as full_time_count,
            COUNT(CASE WHEN employment_type = 'part-time' THEN 1 END) as part_time_count,
            COUNT(CASE WHEN employment_type = 'contract' THEN 1 END) as contract_count,
            ROUND(AVG(CASE WHEN annual_salary > 0 THEN annual_salary END), 0) as avg_annual_salary,
            ROUND(AVG(CASE WHEN monthly_salary > 0 THEN monthly_salary END), 0) as avg_monthly_salary,
            COUNT(DISTINCT source_system) as data_sources,
            MAX(processed_at) as last_updated
          FROM \`${this.projectId}.${this.warehouseDataset}.employees_unified\`
          WHERE is_active = true AND department IS NOT NULL
          GROUP BY department
          ORDER BY total_employees DESC
        `
      },
      {
        name: 'data_freshness_report',
        query: `
          SELECT 
            source_system,
            COUNT(*) as record_count,
            MAX(processed_at) as latest_update,
            TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(processed_at), HOUR) as hours_since_update,
            CASE 
              WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(processed_at), HOUR) <= 1 THEN 'Fresh'
              WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(processed_at), HOUR) <= 24 THEN 'Recent' 
              WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(processed_at), HOUR) <= 168 THEN 'Stale'
              ELSE 'Very Stale'
            END as freshness_status
          FROM \`${this.projectId}.${this.warehouseDataset}.employees_unified\`
          GROUP BY source_system
          ORDER BY latest_update DESC
        `
      },
      {
        name: 'etl_performance_summary',
        query: `
          SELECT 
            DATE(start_time) as execution_date,
            COUNT(*) as total_runs,
            COUNT(CASE WHEN success THEN 1 END) as successful_runs,
            COUNT(CASE WHEN NOT success THEN 1 END) as failed_runs,
            ROUND(AVG(duration_ms) / 1000, 2) as avg_duration_seconds,
            MAX(duration_ms) / 1000 as max_duration_seconds,
            MIN(duration_ms) / 1000 as min_duration_seconds
          FROM \`${this.projectId}.${this.warehouseDataset}.etl_execution_log\`
          GROUP BY DATE(start_time)
          ORDER BY execution_date DESC
          LIMIT 30
        `
      }
    ];

    for (const view of views) {
      await this.createView(view.name, view.query);
    }
  }

  async createView(viewName, query) {
    try {
      const dataset = this.bigquery.dataset(this.warehouseDataset);
      const view = dataset.table(viewName);
      
      const [exists] = await view.exists();
      if (exists) {
        await view.delete();
        console.log(`  🔄 Deleted existing view: ${viewName}`);
      }

      await dataset.createTable(viewName, {
        view: { query, useLegacySql: false }
      });
      
      console.log(`  ✅ Created view: ${viewName}`);
    } catch (error) {
      console.error(`  ❌ Error creating view ${viewName}:`, error.message);
    }
  }

  async listAllTables() {
    console.log('\n📋 Summary of created tables:');
    
    try {
      // List staging tables
      console.log(`\n${this.stagingDataset}:`);
      const [stagingTables] = await this.bigquery.dataset(this.stagingDataset).getTables();
      stagingTables.forEach(table => console.log(`  📊 ${table.id}`));

      // List warehouse tables  
      console.log(`\n${this.warehouseDataset}:`);
      const [warehouseTables] = await this.bigquery.dataset(this.warehouseDataset).getTables();
      warehouseTables.forEach(table => console.log(`  🏭 ${table.id}`));

    } catch (error) {
      console.error('Error listing tables:', error);
    }
  }

  // Method to add sample data for testing
  async insertSampleData() {
    console.log('📝 Inserting sample data for testing...');
    
    const sampleEmployees = [
      {
        employee_id: 'EMP001',
        first_name: 'タロウ',
        last_name: 'タナカ', 
        full_name: 'タナカ タロウ',
        email: 'tanaka.taro@company.com',
        department: '営業部',
        position: '営業担当',
        hire_date: '2023-01-15',
        employment_type: 'full-time',
        annual_salary: 5000000,
        monthly_salary: 416667,
        source_system: 'garoon',
        processed_at: new Date().toISOString(),
        record_id: `garoon_EMP001_${Date.now()}`,
        data_version: 1,
        is_active: true
      },
      {
        employee_id: 'EMP002',
        first_name: 'ハナコ',
        last_name: 'サトウ',
        full_name: 'サトウ ハナコ', 
        email: 'sato.hanako@company.com',
        department: '経理部',
        position: '経理担当',
        hire_date: '2022-06-01',
        employment_type: 'full-time',
        annual_salary: 4500000,
        monthly_salary: 375000,
        source_system: 'smarthr',
        processed_at: new Date().toISOString(),
        record_id: `smarthr_EMP002_${Date.now()}`,
        data_version: 1,
        is_active: true
      }
    ];

    try {
      const table = this.bigquery.dataset(this.warehouseDataset).table('employees_unified');
      await table.insert(sampleEmployees);
      console.log(`  ✅ Inserted ${sampleEmployees.length} sample employee records`);
    } catch (error) {
      console.error('  ❌ Error inserting sample data:', error.message);
    }
  }
}

// CLI script
async function main() {
  const setup = new BigQuerySetup();
  
  const args = process.argv.slice(2);
  const includeSampleData = args.includes('--sample-data');
  
  try {
    await setup.createAllTables();
    
    if (includeSampleData) {
      await setup.insertSampleData();
    }
    
    console.log('\n🎉 BigQuery setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the ETL process: npm run etl');
    console.log('2. Check data quality: npm run quality-check');
    console.log('3. View data in BigQuery console');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BigQuerySetup, tableSchemas };