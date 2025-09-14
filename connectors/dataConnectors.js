// Data Connectors Factory
const GaroonConnector = require('./garoonConnector');
const SmartHRConnector = require('./smarthrConnector');
const JobCanConnector = require('./jobCanConnector');
const GoogleSheetsConnector = require('./googleSheetsConnector');
const PCACloudConnector = require('./pcaCloudConnector');

class DataConnectors {
  constructor() {
    this.connectors = new Map();
  }

  // Register a connector
  registerConnector(name, connector) {
    this.connectors.set(name, connector);
  }

  // Get a connector by name
  getConnector(name) {
    return this.connectors.get(name);
  }

  // Initialize Garoon connector
  initGaroonConnector(baseUrl, username, password) {
    const connector = new GaroonConnector(baseUrl, username, password);
    this.registerConnector('garoon', connector);
    return connector;
  }

  // Initialize SmartHR connector
  initSmartHRConnector(baseUrl, accessToken) {
    const connector = new SmartHRConnector(baseUrl, accessToken);
    this.registerConnector('smarthr', connector);
    return connector;
  }

  // Initialize JobCan connector
  initJobCanConnector(baseUrl, apiKey) {
    const connector = new JobCanConnector(baseUrl, apiKey);
    this.registerConnector('jobcan', connector);
    return connector;
  }

  // Initialize Google Sheets connector
  initGoogleSheetsConnector(credentials, spreadsheetId) {
    const connector = new GoogleSheetsConnector(credentials, spreadsheetId);
    this.registerConnector('googlesheets', connector);
    return connector;
  }

  // Initialize PCA Cloud connector
  initPCACloudConnector(baseUrl, apiKey) {
    const connector = new PCACloudConnector(baseUrl, apiKey);
    this.registerConnector('pcacloud', connector);
    return connector;
  }

  // Test all registered connectors
  async testAllConnections() {
    const results = {};
    
    for (const [name, connector] of this.connectors) {
      try {
        results[name] = await connector.testConnection();
      } catch (error) {
        results[name] = false;
        console.error(`Error testing ${name} connector:`, error);
      }
    }

    return results;
  }

  // Get list of available connectors
  getAvailableConnectors() {
    return Array.from(this.connectors.keys());
  }
}

module.exports = {
  DataConnectors,
  GaroonConnector,
  SmartHRConnector,
  JobCanConnector,
  GoogleSheetsConnector,
  PCACloudConnector
};
