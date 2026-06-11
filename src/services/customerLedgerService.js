const prisma = require("../config/prisma");

const getCustomerLedgerData = async (customerId, businessId) => {

   const invoices = await prisma.invoice.findMany({
      where: { customerId, businessId },
      include: {
         payments: true
      }
   });

   return invoices;
};

module.exports = {
   getCustomerLedgerData
};