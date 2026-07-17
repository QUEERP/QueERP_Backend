const fs = require('fs');
const code = fs.readFileSync('../frontend/app/dashboard/[businessId]/project-operations/inquiries/create/CreateInquiryClient.tsx', 'utf8');
const match = code.match(/const COUNTRIES_WITH_TIMEZONES = \[\s*([\s\S]*?)\];/);
const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
const countries = lines.map(l => {
  const m = l.match(/name:\s*"([^"]+)"/);
  return m ? m[1].toUpperCase().replace(/[^A-Z0-9]/g, '_') : null;
}).filter(Boolean);
console.log(countries.join('\n'));
