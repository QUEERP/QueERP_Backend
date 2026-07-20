const prisma = require('./src/config/prisma');

async function check() {
  const userId = "c1868fc0-c8e9-467c-9a2c-f60b86558661"; // Or whatever userId the current user has

  // wait, I don't know the userId. Let's just run getMyData logic for the business "5920d78b-e438-45f1-85d7-5943fb074fd8"
  const memberships = await prisma.businessUser.findMany({
    where: {
      businessId: "5920d78b-e438-45f1-85d7-5943fb074fd8",
    },
  });
  
  for (const m of memberships) {
    const userId = m.userId;
    console.log("Testing getMyData for user", userId);
    
    try {
      const ownedBusinesses = await prisma.business.findMany({
        where: { ownerId: userId },
        include: {
          settings: true,
          customers: true,
          invoices: { include: { customer: true }, orderBy: { createdAt: "desc" } },
          users: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              role: { include: { rolePermissions: { include: { permission: true } } } },
              userPermissions: { include: { permission: true } },
            },
          },
        },
      });
      console.log(`- Owned: ${ownedBusinesses.length}`);
      
      const memberBusinesses = await prisma.businessUser.findMany({
        where: { userId, isActive: true },
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
          userPermissions: { include: { permission: true } },
          business: {
            include: {
              settings: true,
              customers: true,
              invoices: { include: { customer: true }, orderBy: { createdAt: "desc" } },
            },
          },
        },
      });
      console.log(`- Member: ${memberBusinesses.length}`);
    } catch (e) {
      console.error(`- FAILED for user ${userId}:`, e.message);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
