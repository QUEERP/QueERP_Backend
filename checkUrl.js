const prisma = require('./src/config/prisma');
async function run() {
  const p = await prisma.payment.findUnique({ where: { id: '7de0b3d5-9fe3-4a49-9bc1-c34a4956933a' } });
  console.log('PDF URL:', p.pdfUrl);
}
run().finally(() => prisma.$disconnect());
