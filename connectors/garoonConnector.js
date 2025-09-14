const axios = require('axios');

class GaroonConnector {
  constructor(baseUrl, username, password) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
    this.authHeader = null;
  }

  // Initialize authentication
  async authenticate() {
    try {
      const authString = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      this.authHeader = `Basic ${authString}`;
      return true;
    } catch (error) {
      console.error('Garoon authentication failed:', error);
      return false;
    }
  }

  // Fetch workflow requests with pagination
  async fetchWorkflowRequests(offset = 0, limit = 100) {
    try {
      if (!this.authHeader) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/workflow/admin/requests`, {
        headers: {
          'X-Cybozu-Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        params: {
          offset: offset,
          limit: limit
        }
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.hasNext || false
      };
    } catch (error) {
      console.error('Error fetching Garoon workflow requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch specific workflow request details
  async fetchWorkflowRequestDetails(requestId) {
    try {
      if (!this.authHeader) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/workflow/admin/requests/${requestId}`, {
        headers: {
          'X-Cybozu-Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error fetching Garoon workflow request ${requestId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.fetchWorkflowRequests(0, 1);
      return result.success;
    } catch (error) {
      console.error('Garoon connection test failed:', error);
      return false;
    }
  }
}

module.exports = GaroonConnector;