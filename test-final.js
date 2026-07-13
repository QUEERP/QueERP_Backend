const prisma = require('./src/config/prisma');

// Simulate exactly what the controller now does
async function main() {
  const customerId = "5fd21c5b-0b96-498c-b4b5-cbf86264ff17"; // Dell
  const businessId = "5920d78b-e438-45f1-85d7-5943fb074fd8";

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: businessId }
  });
  
  if (!customer) {
    console.error("ERROR: Customer not found");
    return;
  }
  console.log(`✅ Customer found: ${customer.company || customer.name}`);

  const whereClause = {
    customerId: customerId,
    businessId: businessId,
    isDeleted: false
  };

  const inquiries = await prisma.lead.findMany({
    where: whereClause,
    select: {
      id: true,
      inquiryNumber: true,
      inquiryTitle: true,
      status: true,
      name: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n✅ QUERY RESULT: ${inquiries.length} inquiries returned`);
  
  const formatted = inquiries.map(inq => ({
    id: inq.id,
    inquiryNo: inq.inquiryNumber,
    title: inq.inquiryTitle || inq.name,
    status: inq.status,
    customerName: customer.company || customer.name,
    createdAt: inq.createdAt
  }));

  console.log("\n✅ SIMULATED API RESPONSE:");
  console.log(JSON.stringify({ success: true, inquiries: formatted }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
