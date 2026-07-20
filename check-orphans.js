const prisma = require('./src/config/prisma');

async function checkOrphans() {
  const bu = await prisma.businessUser.findMany({
    include: { business: true }
  });
  
  let orphans = 0;
  for (const m of bu) {
    if (!m.business) {
      console.log(`Orphan BusinessUser found: ID ${m.id}, userId ${m.userId}, businessId ${m.businessId}`);
      orphans++;
    }
  }
  
  console.log(`Total orphan BusinessUsers: ${orphans}`);
}

checkOrphans().catch(console.error).finally(() => prisma.$disconnect());
