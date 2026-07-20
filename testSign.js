require('dotenv').config();
const cloudinary = require('./src/config/cloudinary');
const https = require('https');

const signedUrl = cloudinary.url("payment-pdfs/payment-7de0b3d5-9fe3-4a49-9bc1-c34a4956933a.pdf", {
  resource_type: "raw", 
  type: "upload",
  secure: true,
  sign_url: true
});

console.log("Signed URL:", signedUrl);

https.get(signedUrl, (res) => {
  console.log('STATUS:', res.statusCode);
}).on('error', (e) => {
  console.error('ERROR:', e.message);
});
