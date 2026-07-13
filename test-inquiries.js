const prisma = require('./src/config/prisma');

async function main() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("LAST 5 LEADS/INQUIRIES:");
  leads.forEach(l => {
    console.log(`ID: ${l.id} | title: ${l.inquiryTitle || l.name} | customerId: ${l.customerId} | businessId: ${l.businessId} | status: ${l.status} | deletedAt: ${l.deletedAt} | createdAt: ${l.createdAt}`);
  });
  
  const custs = await prisma.customer.findMany({
    where: { company: { contains: "Dell", mode: "insensitive" } }
  });
  console.log("\nDELL CUSTOMERS:");
  custs.forEach(c => {
    console.log(`ID: ${c.id} | company: ${c.company} | name: ${c.name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
