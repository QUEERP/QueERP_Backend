const prisma = require('./src/config/prisma');

async function main() {
  const customerId = "5fd21c5b-0b96-498c-b4b5-cbf86264ff17";
  const businessId = "5920d78b-e438-45f1-85d7-5943fb074fd8";
  
  const inqs = await prisma.lead.findMany({
    where: {
      customerId: customerId,
      businessId: businessId,
      isDeleted: false
    }
  });
  console.log("Returned Inquiries:", inqs.length);
  inqs.forEach(i => {
    console.log(`ID: ${i.id} | Title: ${i.inquiryTitle} | customerId: ${i.customerId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
