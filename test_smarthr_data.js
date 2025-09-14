// Test SmartHR API call to see the data structure
const testSmartHR = async () => {
  const baseUrl = 'https://e10379b3050f91760fb5d051.daruma.space/api';
  const token = 'shr_1365_JCFQjzsAYYcVbUri9tUaycZZJBbvzugZ';
  
  try {
    console.log('Testing SmartHR API...');
    const response = await fetch(`${baseUrl}/v1/crews?page=1&per_page=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('Data structure:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

testSmartHR();
