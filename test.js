const prisma = require('./src/config/prisma.js');
async function main() {
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
  console.log('--- ALL LEADS ---');
  console.log(JSON.stringify(leads, null, 2));

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true
    }
  });
  console.log('--- ALL CUSTOMERS ---');
  console.log(JSON.stringify(customers, null, 2));
}

main().finally(() => process.exit(0));
