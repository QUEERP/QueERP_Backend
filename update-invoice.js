const prisma = require('./src/config/prisma');

async function run() {
  const inv = await prisma.invoice.findFirst({
    where: { invoiceNumber: 'INV-2026-07-20-1' },
    include: { items: true }
  });
  if (inv) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { currency: 'INR' }
    });
    
    for (const item of inv.items) {
       let taxDetails = item.taxDetails;
       if (!taxDetails || (Array.isArray(taxDetails) && taxDetails.length === 0)) {
          taxDetails = [{ name: 'Tax %', rate: item.taxPercent, amount: (item.quantity * item.rate * item.taxPercent) / 100 }];
          await prisma.invoiceItem.update({
             where: { id: item.id },
             data: { taxDetails }
          });
       }
    }
    console.log('Updated invoice currency to INR and added missing taxDetails');
  } else {
    console.log('Invoice not found');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
