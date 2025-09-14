const axios = require('axios');

class JobCanConnector {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Fetch job postings
  async fetchJobPostings(page = 1, limit = 50) {
    try {
      const response = await axios.get(`${this.baseUrl}/jobs`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          limit: limit
        }
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.length === limit
      };
    } catch (error) {
      console.error('Error fetching JobCan job postings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch applications
  async fetchApplications(jobId = null, page = 1, limit = 50) {
    try {
      const url = jobId ? `${this.baseUrl}/jobs/${jobId}/applications` : `${this.baseUrl}/applications`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          limit: limit
        }
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.length === limit
      };
    } catch (error) {
      console.error('Error fetching JobCan applications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch candidates
  async fetchCandidates(page = 1, limit = 50) {
    try {
      const response = await axios.get(`${this.baseUrl}/candidates`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          limit: limit
        }
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.length === limit
      };
    } catch (error) {
      console.error('Error fetching JobCan candidates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.fetchJobPostings(1, 1);
      return result.success;
    } catch (error) {
      console.error('JobCan connection test failed:', error);
      return false;
    }
  }
}

module.exports = JobCanConnector;