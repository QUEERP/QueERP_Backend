const prisma = require('./src/config/prisma');

async function fixQuotations() {
  console.log('Checking Quotations for duplicates...');
  const quotes = await prisma.quotation.findMany({
    select: { id: true, businessId: true, quoteNumber: true },
    orderBy: { createdAt: 'asc' }
  });

  const seen = new Set();
  let duplicateCount = 0;

  for (const q of quotes) {
    const key = `${q.businessId}-${q.quoteNumber}`;
    if (seen.has(key)) {
      const newQuoteNumber = `${q.quoteNumber}-DUP-${q.id.substring(0, 4)}`;
      console.log(`Found duplicate quote: ${q.quoteNumber}. Renaming to ${newQuoteNumber}`);
      await prisma.quotation.update({
        where: { id: q.id },
        data: { quoteNumber: newQuoteNumber }
      });
      duplicateCount++;
      // Add the new one to seen just in case
      seen.add(`${q.businessId}-${newQuoteNumber}`);
    } else {
      seen.add(key);
    }
  }
  console.log(`Fixed ${duplicateCount} duplicate quotations.`);
}

async function fixSalesOrders() {
  console.log('Checking SalesOrders for duplicates...');
  const orders = await prisma.salesOrder.findMany({
    select: { id: true, businessId: true, orderNumber: true },
    orderBy: { createdAt: 'asc' }
  });

  const seen = new Set();
  let duplicateCount = 0;

  for (const o of orders) {
    const key = `${o.businessId}-${o.orderNumber}`;
    if (seen.has(key)) {
      const newOrderNumber = `${o.orderNumber}-DUP-${o.id.substring(0, 4)}`;
      console.log(`Found duplicate order: ${o.orderNumber}. Renaming to ${newOrderNumber}`);
      await prisma.salesOrder.update({
        where: { id: o.id },
        data: { orderNumber: newOrderNumber }
      });
      duplicateCount++;
      seen.add(`${o.businessId}-${newOrderNumber}`);
    } else {
      seen.add(key);
    }
  }
  console.log(`Fixed ${duplicateCount} duplicate sales orders.`);
}

async function main() {
  try {
    await fixQuotations();
    await fixSalesOrders();
    console.log('All duplicates fixed! You can now safely run `npx prisma db push`.');
  } catch (error) {
    console.error('Error fixing duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
