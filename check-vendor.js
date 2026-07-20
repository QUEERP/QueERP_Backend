const prisma = require('./src/config/prisma');

async function check() {
  const businessId = "5920d78b-e438-45f1-85d7-5943fb074fd8";
  const vendors = await prisma.vendor.findMany({
    where: { businessId }
  });
  console.log(`Vendors for business ${businessId}:`, vendors);
  
  // Also check all vendors just in case businessId was null or something
  const allVendors = await prisma.vendor.findMany();
  console.log(`Total vendors in DB:`, allVendors.length);
  if (allVendors.length > 0) {
    console.log("Sample vendor:", allVendors[allVendors.length - 1]);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
