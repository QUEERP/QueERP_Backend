const prisma = require('./src/config/prisma');

async function check() {
  const businessId = "5920d78b-e438-45f1-85d7-5943fb074fd8"; // From the URL screenshot
  const bu = await prisma.businessUser.findMany({
    where: { businessId }
  });
  console.log("BusinessUsers for this business:", bu);
  
  const b = await prisma.business.findUnique({ where: { id: businessId }});
  console.log("Business exists:", !!b);
  
  // Also check the URL's businessId, is it right?
  // Let's check all businesses and their users
  const allB = await prisma.business.findMany();
  console.log("All Businesses:");
  for (const b of allB) {
    console.log(`- ${b.id} : ${b.name}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
