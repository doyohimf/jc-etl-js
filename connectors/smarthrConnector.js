const axios = require('axios');

class SmartHRConnector {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  // Fetch employees data
  async fetchEmployees(page = 1, perPage = 50) {
    try {
      const response = await axios.get(`${this.baseUrl}/crew`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          per_page: perPage
        }
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.length === perPage
      };
    } catch (error) {
      console.error('Error fetching SmartHR employees:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch employee details
  async fetchEmployeeDetails(employeeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/crew/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error fetching SmartHR employee ${employeeId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch departments
  async fetchDepartments() {
    try {
      const response = await axios.get(`${this.baseUrl}/departments`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching SmartHR departments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.fetchEmployees(1, 1);
      return result.success;
    } catch (error) {
      console.error('SmartHR connection test failed:', error);
      return false;
    }
  }
}

module.exports = SmartHRConnector;