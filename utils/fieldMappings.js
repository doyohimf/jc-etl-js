// utils/fieldMappings.js
const fieldMappings = {
  // Garoon to SmartHR unified format
  garoon_to_unified: {
    'employee_id': 'employee_id',
    'last_name_kanji': 'last_name',
    'first_name_kanji': 'first_name', 
    'email_address': 'email',
    'department_1': 'department',
    'joining_date': 'hire_date',
    'work_hours': 'working_hours',
    'work_type': 'employment_type',
    'annual_salary': 'annual_salary'
  },

  // SmartHR to unified format
  smarthr_to_unified: {
    'employee_id': 'employee_id',
    'last_name_katakana': 'last_name',
    'first_name_katakana': 'first_name',
    'personal_email': 'email',
    'department': 'department',
    'joining_date': 'hire_date',
    'birth_date': 'birth_date',
    'gender': 'gender',
    'working_hours': 'working_hours',
    'work_type': 'employment_type',
    'annual_salary': 'annual_salary',
    'monthly_salary': 'monthly_salary',
    'employment_insurance_status': 'employment_insurance',
    'social_insurance_status': 'social_insurance'
  },

  // JobCan to unified format
  jobcan_to_unified: {
    'employee_id': 'employee_id',
    'full_name': 'full_name',
    'department': 'department',
    'joining_date': 'hire_date',
    'hourly_wage': 'hourly_wage'
  },

  // PCA Cloud to unified format
  pca_to_unified: {
    'employee_id': 'employee_id',
    'full_name': 'full_name',
    'department': 'department',
    'position': 'position',
    'basic_salary': 'basic_salary',
    'allowances': 'allowances',
    'deductions': 'deductions',
    'net_salary': 'net_salary'
  },

  // Google Sheets common field mappings
  sheets_hr_to_unified: {
    'employee_code': 'employee_id',
    'name': 'full_name',
    'department': 'department',
    'position': 'position',
    'hire_date': 'hire_date',
    'salary': 'monthly_salary'
  }
};

// Data validation rules
const validationRules = {
  employee_id: {
    required: true,
    type: 'string',
    minLength: 1
  },
  email: {
    required: false,
    type: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  hire_date: {
    required: false,
    type: 'date'
  },
  annual_salary: {
    required: false,
    type: 'number',
    min: 0
  },
  monthly_salary: {
    required: false,
    type: 'number',
    min: 0
  }
};

module.exports = { fieldMappings, validationRules };

