// tests/etl.test.js
const { EnhancedETLOrchestrator } = require('../index');
const { DataTransformer } = require('../utils/dataTransformer');

describe('ETL System Tests', () => {
  let orchestrator;
  let transformer;

  beforeAll(() => {
    orchestrator = new EnhancedETLOrchestrator();
    transformer = new DataTransformer();
  });

  describe('Data Transformation Tests', () => {
    test('should transform Garoon data correctly', () => {
      const garoonData = [{
        employee_id: 'EMP001',
        last_name_kanji: '田中',
        first_name_kanji: '太郎',
        email_address: 'tanaka@company.com',
        department_1: '営業部',
        joining_date: '2023-01-15',
        annual_salary: 5000000
      }];

      const transformed = transformer.transform(garoonData, 'garoon');
      
      expect(transformed).toHaveLength(1);
      expect(transformed[0].employee_id).toBe('EMP001');
      expect(transformed[0].source_system).toBe('garoon');
      expect(transformed[0].hire_date).toBe('2023-01-15T00:00:00.000Z');
      expect(transformed[0].annual_salary).toBe(5000000);
    });

    test('should handle missing fields gracefully', () => {
      const incompleteData = [{
        employee_id: 'EMP002',
        last_name_kanji: '佐藤'
        // Missing other fields
      }];

      const transformed = transformer.transform(incompleteData, 'garoon');
      
      expect(transformed).toHaveLength(1);
      expect(transformed[0].employee_id).toBe('EMP002');
      expect(transformed[0].first_name).toBeNull();
    });

    test('should validate data correctly', () => {
      const invalidData = {
        employee_id: '', // Required but empty
        email: 'invalid-email', // Invalid format
        annual_salary: -1000 // Negative salary
      };

      const validation = transformer.validateRecord(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('Required field employee_id'));
      expect(validation.errors).toContain(expect.stringContaining('Invalid email format'));
    });

    test('should merge duplicate records', () => {
      const duplicates = [
        {
          employee_id: 'EMP001',
          first_name: 'John',
          last_name: null,
          source_system: 'garoon',
          processed_at: '2023-01-01T00:00:00.000Z'
        },
        {
          employee_id: 'EMP001',
          first_name: null,
          last_name: 'Doe',
          source_system: 'smarthr',
          processed_at: '2023-01-02T00:00:00.000Z'
        }
      ];

      const merged = transformer.mergeDuplicates(duplicates);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].employee_id).toBe('EMP001');
      expect(merged[0].first_name).toBe('John');
      expect(merged[0].last_name).toBe('Doe');
      expect(merged[0].merged_records_count).toBe(2);
    });
  });

  describe('Schema Generation Tests', () => {
    test('should generate correct BigQuery schema', () => {
      const sampleRecord = {
        employee_id: 'EMP001',
        salary: 50000,
        is_active: true,
        hire_date: '2023-01-15T00:00:00.000Z',
        notes: null
      };

      const schema = orchestrator.generateSchemaFromRecord(sampleRecord);
      
      expect(schema.fields).toEqual(expect.arrayContaining([
        { name: 'employee_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'salary', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'is_active', type: 'BOOLEAN', mode: 'NULLABLE' },
        { name: 'hire_date', type: 'TIMESTAMP', mode: 'NULLABLE' },
        { name: 'notes', type: 'STRING', mode: 'NULLABLE' }
      ]));
    });
  });

  describe('Data Quality Assessment Tests', () => {
    test('should assess data quality correctly', () => {
      const records = [
        { employee_id: 'EMP001', first_name: 'John', email: 'john@test.com' },
        { employee_id: 'EMP002', first_name: null, email: 'jane@test.com' },
        { employee_id: 'EMP003', first_name: 'Bob', email: null }
      ];

      const quality = transformer.assessDataQuality(records);
      
      expect(quality.totalRecords).toBe(3);
      expect(quality.fieldCompleteness.employee_id).toBe(100);
      expect(quality.fieldCompleteness.first_name).toBeCloseTo(66.67, 1);
      expect(quality.fieldCompleteness.email).toBeCloseTo(66.67, 1);
    });
  });
});