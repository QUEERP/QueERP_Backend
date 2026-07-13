const prisma = require('./src/config/prisma.js');
const fs = require('fs');
async function main() {
  try {
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        customerId: true,
        businessId: true,
        inquiryNumber: true,
        inquiryTitle: true,
        status: true,
        company: true
      }
    });
    
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        company: true
      }
    });
    
    fs.writeFileSync('c:/Users/DELL/Downloads/queerp/backend/output.json', JSON.stringify({ leads, customers }, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main().finally(() => process.exit(0));
