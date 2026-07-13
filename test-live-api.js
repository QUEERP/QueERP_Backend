// Direct HTTP test of the live API
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/project-operations/inquiries?customerId=5fd21c5b-0b96-498c-b4b5-cbf86264ff17',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test',
    'x-business-id': '5920d78b-e438-45f1-85d7-5943fb074fd8',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('RESPONSE:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('\nParsed:');
      if (parsed.success) {
        console.log(`✅ success=true, inquiries count=${parsed.inquiries?.length}`);
        parsed.inquiries?.forEach(i => console.log(`  - ${i.inquiryNo} | ${i.title} | ${i.status} | ${i.customerName}`));
      } else {
        console.log('❌ Error:', parsed.message);
      }
    } catch(e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.end();
