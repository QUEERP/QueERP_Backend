const axios = require('axios');
const url = "https://res.cloudinary.com/dhlkrp27h/raw/upload/v1784208567/payment-pdfs/payment-7de0b3d5-9fe3-4a49-9bc1-c34a4956933a.pdf";

axios.get(url).then(r => console.log('OK', r.status)).catch(e => console.error('ERROR:', e.response?.status, e.response?.data));
