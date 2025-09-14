# Multi-Source ETL Automation - Quick Reference

## 🚀 Your automated ETL is now running with multiple data sources!

### Current Status
- ✅ **Garoon Workflow**: Cloud Function with stateful resumable processing (ACTIVE)
- ✅ **SmartHR Employees**: Cloud Function with complete data extraction (COMPLETE)
- ✅ Cloud Scheduler running every 5 minutes for Garoon
- ✅ ETL processes 1000 Garoon records per run / All SmartHR data extracted
- ✅ State tracking in BigQuery prevents duplicates
- ✅ Automatic completion detection

### 📊 Data Sources & Status

| Source | Status | Records | Table | Notes |
|--------|--------|---------|-------|-------|
| Garoon Workflow | 🔄 ACTIVE | 37,500+ | `raw_workflow_requests` | Continues every 5 min |
| SmartHR Employees | ✅ COMPLETE | 39 | `smarthr_employees` | All data extracted |

### 📊 Monitoring Commands

```bash
# Real-time multi-source dashboard (auto-refreshing)
node dashboard.js

# One-time status check for all sources
node monitor_progress.js

# Check scheduler status
gcloud scheduler jobs list --location="asia-northeast1"

# View recent function logs
gcloud functions logs read runFullETL --region=asia-northeast1 --limit=50

# Check all ETL states
bq query --use_legacy_sql=false "SELECT * FROM \`jc-etl-js.hr_staging.etl_state\`"

# Check data counts
bq query --use_legacy_sql=false "
SELECT 
  'Garoon Workflow' as source, 
  COUNT(DISTINCT request_id) as unique_records 
FROM \`jc-etl-js.hr_staging.raw_workflow_requests\`
UNION ALL
SELECT 
  'SmartHR Employees' as source, 
  COUNT(DISTINCT employee_id) as unique_records 
FROM \`jc-etl-js.hr_staging.smarthr_employees\`"
```

### 🎛️ Control Commands

```bash
# Pause Garoon scheduler (stops automatic runs)
gcloud scheduler jobs pause garoon-etl-scheduler --location="asia-northeast1"

# Resume Garoon scheduler  
gcloud scheduler jobs resume garoon-etl-scheduler --location="asia-northeast1"

# Manually trigger Garoon ETL run
curl -X POST -H "Content-Type: application/json" \
  -d '{"source": "garoon", "target": "bigquery"}' \
  https://asia-northeast1-jc-etl-js.cloudfunctions.net/runFullETL

# Manually trigger SmartHR ETL run
curl -X POST -H "Content-Type: application/json" \
  -d '{"source": "smarthr", "target": "bigquery"}' \
  https://asia-northeast1-jc-etl-js.cloudfunctions.net/runFullETL

# Reset Garoon ETL to start from beginning (if needed)
curl -X POST -H "Content-Type: application/json" \
  -d '{"reset": true}' \
  https://asia-northeast1-jc-etl-js.cloudfunctions.net/runFullETL
```

### 📋 What happens automatically:

#### Garoon Workflow ETL:
1. **Every 5 minutes**: Scheduler triggers the Cloud Function
2. **Each run**: Processes exactly 1000 records from where it left off  
3. **State tracking**: Updates offset and progress in BigQuery
4. **Duplicate handling**: MERGE operation prevents duplicate records
5. **Auto-completion**: Stops when all data is retrieved

#### SmartHR Employee ETL:
1. **On-demand**: Manual trigger or scheduled runs
2. **Complete extraction**: All 39 employee records extracted
3. **State tracking**: Marked as complete (has_more_data: false)
4. **Data transformation**: Properly mapped to BigQuery schema

### 🎯 Current Progress:
- **Garoon**: Next offset 37,000+ (active processing)
- **SmartHR**: All 39 employees extracted (complete)
- **Total**: 37,500+ records across both systems
- **BigQuery Tables**: Both properly structured and populated

### ⚠️ Important Notes:

- **Garoon ETL** continues running until ALL workflow data is extracted
- **SmartHR ETL** is complete but can be re-run for updates
- Each run safely resumes from the exact point where it left off
- No data will be lost or duplicated due to the stateful design
- You can safely pause/resume operations anytime
- Monitor progress with the multi-source monitoring scripts

### 🏁 When Garoon ETL Completes:

The Garoon ETL will automatically detect when all data is retrieved and stop processing. You'll see:
- `has_more_data: false` in the state
- "ETL process complete" messages in logs  
- Multi-source dashboard will show all sources complete

At that point, you can pause the scheduler to stop unnecessary runs.

### 💡 Future Expansion:

The ETL framework now supports multiple data sources. To add new sources:
1. Add new environment variables for API credentials
2. Create new transformation functions 
3. Add new table schemas to `loadToBigQuery()`
4. Add new source handling in the main `runFullETL()` function
5. Update monitoring scripts

---
**Your multi-source automated ETL is now running! Use `node monitor_progress.js` to monitor all sources.**
