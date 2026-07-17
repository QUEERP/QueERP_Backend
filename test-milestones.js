const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const milestones = await prisma.projectMilestone.findMany({ include: { owner: true, project: true } });
    console.log('Count:', milestones.length);
    console.log(milestones);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
