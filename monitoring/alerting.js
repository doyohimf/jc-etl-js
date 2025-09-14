// monitoring/alerting.js
const { BigQuery } = require('@google-cloud/bigquery');
const axios = require('axios');

class DataQualityMonitor {
  constructor() {
    this.bigquery = new BigQuery();
    this.thresholds = {
      dataFreshness: 24, // hours
      completenessScore: 80, // percentage
      validityScore: 95, // percentage
      duplicateThreshold: 5 // percentage
    };
  }

  async checkDataFreshness() {
    const query = `
      SELECT 
        source_system,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(processed_at), HOUR) as hours_since_update
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_data_warehouse.employees_unified\`
      GROUP BY source_system
      HAVING hours_since_update > @threshold
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { threshold: this.thresholds.dataFreshness }
    });

    return rows.map(row => ({
      type: 'data_freshness',
      severity: 'warning',
      message: `${row.source_system} data is ${row.hours_since_update} hours old`,
      source_system: row.source_system,
      hours_old: row.hours_since_update
    }));
  }

  async checkDataQuality() {
    const query = `
      WITH quality_metrics AS (
        SELECT 
          source_system,
          COUNT(*) as total_records,
          COUNTIF(employee_id IS NOT NULL AND employee_id != '') as valid_employee_ids,
          COUNTIF(email IS NOT NULL AND REGEXP_CONTAINS(email, r'^[^@]+@[^@]+\.[^@]+$')) as valid_emails
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_data_warehouse.employees_unified\`
        WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        GROUP BY source_system
      )
      SELECT 
        source_system,
        total_records,
        ROUND((valid_employee_ids / total_records) * 100, 2) as employee_id_completeness,
        ROUND((valid_emails / NULLIF(total_records, 0)) * 100, 2) as email_validity
      FROM quality_metrics
    `;

    const [rows] = await this.bigquery.query({ query });
    const alerts = [];

    for (const row of rows) {
      if (row.employee_id_completeness < this.thresholds.completenessScore) {
        alerts.push({
          type: 'data_completeness',
          severity: 'error',
          message: `${row.source_system} employee ID completeness is ${row.employee_id_completeness}%`,
          source_system: row.source_system,
          metric_value: row.employee_id_completeness
        });
      }

      if (row.email_validity < this.thresholds.validityScore) {
        alerts.push({
          type: 'data_validity',
          severity: 'warning',
          message: `${row.source_system} email validity is ${row.email_validity}%`,
          source_system: row.source_system,
          metric_value: row.email_validity
        });
      }
    }

    return alerts;
  }

  async checkForDuplicates() {
    const query = `
      WITH duplicates AS (
        SELECT 
          employee_id,
          COUNT(*) as duplicate_count
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_data_warehouse.employees_unified\`
        WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        GROUP BY employee_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        COUNT(*) as total_duplicates,
        (SELECT COUNT(DISTINCT employee_id) FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.hr_data_warehouse.employees_unified\`) as total_unique_employees
      FROM duplicates
    `;

    const [rows] = await this.bigquery.query({ query });
    const alerts = [];

    if (rows.length > 0) {
      const duplicatePercentage = (rows[0].total_duplicates / rows[0].total_unique_employees) * 100;
      
      if (duplicatePercentage > this.thresholds.duplicateThreshold) {
        alerts.push({
          type: 'duplicate_records',
          severity: 'warning',
          message: `${duplicatePercentage.toFixed(2)}% of records are duplicates`,
          metric_value: duplicatePercentage
        });
      }
    }

    return alerts;
  }

  async runAllChecks() {
    try {
      const [freshnessAlerts, qualityAlerts, duplicateAlerts] = await Promise.all([
        this.checkDataFreshness(),
        this.checkDataQuality(),
        this.checkForDuplicates()
      ]);

      const allAlerts = [...freshnessAlerts, ...qualityAlerts, ...duplicateAlerts];
      
      if (allAlerts.length > 0) {
        await this.sendAlerts(allAlerts);
      }

      return {
        timestamp: new Date().toISOString(),
        alerts_count: allAlerts.length,
        alerts: allAlerts
      };
    } catch (error) {
      console.error('Error running data quality checks:', error);
      throw error;
    }
  }

  async sendAlerts(alerts) {
    // Send to Slack, email, or other alerting systems
    const severeCounts = alerts.filter(a => a.severity === 'error').length;
    const warningCounts = alerts.filter(a => a.severity === 'warning').length;

    const slackMessage = {
      text: `HR ETL Data Quality Alert`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 HR ETL Data Quality Alert'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Errors:* ${severeCounts}`
            },
            {
              type: 'mrkdwn',
              text: `*Warnings:* ${warningCounts}`
            }
          ]
        },
        ...alerts.map(alert => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.type}*: ${alert.message}`
          }
        }))
      ]
    };

    // Send to Slack webhook (if configured)
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await axios.post(slackWebhookUrl, slackMessage);
      } catch (error) {
        console.error('Error sending Slack alert:', error);
      }
    }

    // Log alerts to BigQuery for historical tracking
    await this.logAlerts(alerts);
  }

  async logAlerts(alerts) {
    try {
      const table = this.bigquery.dataset('hr_data_warehouse').table('data_quality_alerts');
      
      const records = alerts.map(alert => ({
        alert_id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        source_system: alert.source_system || null,
        metric_value: alert.metric_value || null
      }));

      await table.insert(records);
    } catch (error) {
      console.error('Error logging alerts:', error);
    }
  }
}

// Cloud Function for monitoring
const functions = require('@google-cloud/functions-framework');

functions.http('dataQualityCheck', async (req, res) => {
  try {
    const monitor = new DataQualityMonitor();
    const results = await monitor.runAllChecks();
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Data quality check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});