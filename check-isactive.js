const prisma = require('./src/config/prisma');

async function check() {
  const bu = await prisma.businessUser.findMany({
    where: { businessId: "5920d78b-e438-45f1-85d7-5943fb074fd8" },
    include: { user: true }
  });
  console.log("BusinessUsers for 5920d78b-e438-45f1-85d7-5943fb074fd8:");
  console.log(JSON.stringify(bu, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
