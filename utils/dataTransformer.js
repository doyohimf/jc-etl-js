// utils/dataTransformer.js
const _ = require('lodash');
const moment = require('moment');
const { fieldMappings, validationRules } = require('./fieldMappings');

class DataTransformer {
  constructor() {
    this.kanjiToKatakana = this.initializeKanjiConverter();
  }

  // Initialize Kanji to Katakana converter (simplified version)
  initializeKanjiConverter() {
    // In production, use kuroshiro library for proper conversion
    // For now, this is a placeholder
    return (text) => {
      if (!text) return text;
      // Add your Kanji to Katakana conversion logic here
      // You can use libraries like kuroshiro or wanakana
      return text; // Placeholder
    };
  }

  // Main transformation method
  transform(data, sourceSystem, targetSchema = 'unified') {
    if (!Array.isArray(data)) {
      data = [data];
    }

    const mappingKey = `${sourceSystem}_to_${targetSchema}`;
    const mapping = fieldMappings[mappingKey];

    if (!mapping) {
      throw new Error(`No field mapping found for ${mappingKey}`);
    }

    return data.map(record => this.transformRecord(record, mapping, sourceSystem));
  }

  // Transform individual record
  transformRecord(record, mapping, sourceSystem) {
    const transformed = {};
    
    // Apply field mappings
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (record[sourceField] !== undefined && record[sourceField] !== null) {
        transformed[targetField] = this.transformValue(
          record[sourceField], 
          sourceField, 
          targetField,
          sourceSystem
        );
      }
    }

    // Add metadata
    transformed.source_system = sourceSystem;
    transformed.processed_at = new Date().toISOString();
    transformed.record_id = this.generateRecordId(sourceSystem, record);
    transformed.data_version = 1;

    // Validate transformed data
    const validationResult = this.validateRecord(transformed);
    if (!validationResult.isValid) {
      console.warn(`Validation warnings for record ${transformed.record_id}:`, validationResult.errors);
    }

    return transformed;
  }

  // Transform individual values based on field types
  transformValue(value, sourceField, targetField, sourceSystem) {
    // Handle null/empty values
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Special transformations based on source system and field
    if (sourceSystem === 'garoon' && sourceField.includes('kanji')) {
      return this.kanjiToKatakana(value);
    }

    // Date transformations
    if (this.isDateField(targetField)) {
      return this.transformDate(value);
    }

    // Number transformations
    if (this.isNumberField(targetField)) {
      return this.transformNumber(value);
    }

    // String transformations
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  }

  // Date transformation utility
  transformDate(dateValue) {
    if (!dateValue) return null;
    
    const date = moment(dateValue);
    return date.isValid() ? date.toISOString() : null;
  }

  // Number transformation utility
  transformNumber(numberValue) {
    if (typeof numberValue === 'number') return numberValue;
    
    const parsed = parseFloat(numberValue);
    return isNaN(parsed) ? null : parsed;
  }

  // Check if field is a date field
  isDateField(fieldName) {
    const dateFields = ['hire_date', 'birth_date', 'created_at', 'updated_at', 'processed_at'];
    return dateFields.includes(fieldName) || fieldName.includes('date') || fieldName.includes('time');
  }

  // Check if field is a number field
  isNumberField(fieldName) {
    const numberFields = ['salary', 'wage', 'allowance', 'deduction', 'hours', 'amount'];
    return numberFields.some(nf => fieldName.includes(nf));
  }

  // Generate unique record ID
  generateRecordId(sourceSystem, record) {
    const employeeId = record.employee_id || record.emp_code || record.code || 'unknown';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${sourceSystem}_${employeeId}_${timestamp}_${random}`;
  }

  // Validate transformed record
  validateRecord(record) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = record[field];
      
      // Check required fields
      if (rules.required && (value === null || value === undefined)) {
        errors.push(`Required field ${field} is missing`);
        continue;
      }
      
      // Skip validation if field is null/undefined and not required
      if (value === null || value === undefined) continue;
      
      // Type validation
      if (rules.type === 'email' && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Invalid email format for field ${field}: ${value}`);
      }
      
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Field ${field} should be a number, got ${typeof value}`);
      }
      
      if (rules.type === 'date' && !moment(value).isValid()) {
        errors.push(`Invalid date format for field ${field}: ${value}`);
      }
      
      // Range validation
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field ${field} value ${value} is below minimum ${rules.min}`);
      }
      
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`Field ${field} length ${value.length} is below minimum ${rules.minLength}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Merge duplicate records based on employee_id
  mergeDuplicates(records) {
    const grouped = _.groupBy(records, 'employee_id');
    
    return Object.values(grouped).map(duplicates => {
      if (duplicates.length === 1) return duplicates[0];
      
      // Merge strategy: latest processed_at wins, but preserve non-null values
      const merged = duplicates.reduce((acc, current) => {
        for (const [key, value] of Object.entries(current)) {
          if (value !== null && value !== undefined) {
            if (acc[key] === null || acc[key] === undefined) {
              acc[key] = value;
            } else if (key === 'processed_at') {
              // Keep latest processed_at
              acc[key] = moment(value).isAfter(moment(acc[key])) ? value : acc[key];
            }
          }
        }
        return acc;
      }, duplicates[0]);
      
      merged.merged_records_count = duplicates.length;
      merged.source_systems = _.uniq(duplicates.map(d => d.source_system)).join(',');
      
      return merged;
    });
  }

  // Data quality assessment
  assessDataQuality(records) {
    const totalRecords = records.length;
    const qualityMetrics = {
      totalRecords,
      completenessScore: 0,
      validityScore: 0,
      duplicateCount: 0,
      fieldCompleteness: {}
    };

    // Calculate field completeness
    const allFields = _.uniq(_.flatMap(records, Object.keys));
    allFields.forEach(field => {
      const nonNullCount = records.filter(r => r[field] !== null && r[field] !== undefined).length;
      qualityMetrics.fieldCompleteness[field] = (nonNullCount / totalRecords) * 100;
    });

    // Overall completeness score
    qualityMetrics.completenessScore = _.mean(Object.values(qualityMetrics.fieldCompleteness));

    // Validity score based on validation rules
    const validRecords = records.filter(record => this.validateRecord(record).isValid);
    qualityMetrics.validityScore = (validRecords.length / totalRecords) * 100;

    // Duplicate detection
    const employeeIds = records.map(r => r.employee_id).filter(Boolean);
    qualityMetrics.duplicateCount = employeeIds.length - _.uniq(employeeIds).length;

    return qualityMetrics;
  }
}

module.exports = { DataTransformer };