const axios = require('axios');

class PCACloudConnector {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Fetch accounting data
  async fetchAccountingData(dataType, page = 1, limit = 50) {
    try {
      const response = await axios.get(`${this.baseUrl}/${dataType}`, {
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
      console.error(`Error fetching PCA Cloud ${dataType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch journal entries
  async fetchJournalEntries(startDate = null, endDate = null, page = 1, limit = 50) {
    try {
      const params = {
        page: page,
        limit: limit
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(`${this.baseUrl}/journal_entries`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: params
      });

      return {
        success: true,
        data: response.data,
        hasNext: response.data.length === limit
      };
    } catch (error) {
      console.error('Error fetching PCA Cloud journal entries:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fetch accounts
  async fetchAccounts() {
    try {
      const response = await axios.get(`${this.baseUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching PCA Cloud accounts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.fetchAccounts();
      return result.success;
    } catch (error) {
      console.error('PCA Cloud connection test failed:', error);
      return false;
    }
  }
}

module.exports = PCACloudConnector;