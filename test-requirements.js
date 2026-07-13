const prisma = require('./src/config/prisma');

async function main() {
  // Step 1: Check what's in ProjectRequirement table
  const reqs = await prisma.projectRequirement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, requirementNumber: true, title: true, businessId: true, customerId: true, createdAt: true }
  });
  console.log(`\n=== ProjectRequirement table: ${reqs.length} records ===`);
  reqs.forEach(r => console.log(`  ID: ${r.id} | Num: ${r.requirementNumber} | Title: ${r.title} | Business: ${r.businessId} | createdAt: ${r.createdAt}`));

  if (reqs.length === 0) {
    console.log('\n⚠️  TABLE IS EMPTY - no requirements have been saved to the database');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
