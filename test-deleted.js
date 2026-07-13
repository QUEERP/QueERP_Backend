const prisma = require('./src/config/prisma');

async function main() {
  const customerId = "5fd21c5b-0b96-498c-b4b5-cbf86264ff17";
  
  const inqs = await prisma.lead.findMany({
    where: { customerId: customerId }
  });
  console.log(`Found ${inqs.length} inquiries for Dell`);
  inqs.forEach(i => {
    console.log(`ID: ${i.id} | isDeleted: ${i.isDeleted} | type: ${typeof i.isDeleted} | requirementId: ${i.requirementId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
