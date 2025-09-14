// Test SmartHR API pagination and total records
const testSmartHRPagination = async () => {
  const baseUrl = 'https://e10379b3050f91760fb5d051.daruma.space/api';
  const token = 'shr_1365_JCFQjzsAYYcVbUri9tUaycZZJBbvzugZ';
  
  console.log('🔍 Testing SmartHR API pagination...\n');
  
  let totalRecords = 0;
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  
  while (hasMore && page <= 5) { // Limit to 5 pages for testing
    try {
      console.log(`📄 Testing page ${page}...`);
      const response = await fetch(`${baseUrl}/v1/crews?page=${page}&per_page=${perPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        const recordsOnThisPage = Array.isArray(data) ? data.length : 0;
        totalRecords += recordsOnThisPage;
        
        console.log(`   📊 Records on page ${page}: ${recordsOnThisPage}`);
        console.log(`   📈 Total so far: ${totalRecords}`);
        
        // Check if there are more pages
        hasMore = recordsOnThisPage === perPage;
        
        if (recordsOnThisPage > 0) {
          // Show sample data from first page
          if (page === 1) {
            console.log(`   📝 Sample record fields:`, Object.keys(data[0]));
            console.log(`   👤 Sample employee: ${data[0].last_name || 'N/A'} ${data[0].first_name || 'N/A'} (${data[0].emp_code || 'No Code'})`);
          }
        }
        
        page++;
      } else {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
        break;
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
      break;
    }
    
    console.log(''); // Empty line between pages
  }
  
  console.log('📊 Final Results:');
  console.log(`   📈 Total Records Found: ${totalRecords}`);
  console.log(`   📄 Pages Checked: ${page - 1}`);
  console.log(`   ✅ Expected Records Match: ${totalRecords === 39 ? 'YES' : 'NO'}`);
  
  if (totalRecords === 39) {
    console.log('\n✅ Confirmed: SmartHR has exactly 39 employee records total.');
    console.log('   This is the complete dataset - no additional pagination needed.');
  } else if (totalRecords > 39) {
    console.log('\n⚠️  Found more records than previously extracted!');
    console.log('   The ETL may need to be re-run to capture all data.');
  } else {
    console.log('\n🤔 Found fewer records in this test than previously extracted.');
    console.log('   This could be due to API filtering or recent changes.');
  }
};

testSmartHRPagination();
