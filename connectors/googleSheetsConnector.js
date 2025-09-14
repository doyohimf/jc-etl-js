const { google } = require('googleapis');

class GoogleSheetsConnector {
  constructor(credentials, spreadsheetId) {
    this.credentials = credentials;
    this.spreadsheetId = spreadsheetId;
    this.sheets = null;
  }

  // Initialize Google Sheets API
  async authenticate() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: this.credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      return true;
    } catch (error) {
      console.error('Google Sheets authentication failed:', error);
      return false;
    }
  }

  // Read data from a sheet
  async readSheet(range) {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      return {
        success: true,
        data: response.data.values || []
      };
    } catch (error) {
      console.error('Error reading Google Sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Write data to a sheet
  async writeSheet(range, values) {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error writing to Google Sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Append data to a sheet
  async appendSheet(range, values) {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error appending to Google Sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get sheet metadata
  async getSheetInfo() {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting sheet info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.getSheetInfo();
      return result.success;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }
}

module.exports = GoogleSheetsConnector;
