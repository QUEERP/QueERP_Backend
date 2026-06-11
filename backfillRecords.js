const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to backfill old records with default values or new logic.
 * Run this after significant schema changes or when adding new mandatory fields.
 * 
 * Usage: node backfillRecords.js
 */

async function main() {
  console.log('🚀 Starting Data Backfill...');

  try {
    // 1. Backfill Products
    console.log('📦 Processing Products...');
    const products = await prisma.product.findMany();
    for (const p of products) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          isActive: p.isActive ?? true,
          unit: p.unit ?? 'pcs',
          taxPercent: p.taxPercent ?? 0,
          reorderLevel: p.reorderLevel ?? 0,
          minimumStock: p.minimumStock ?? 0,
          openingStock: p.openingStock ?? 0,
        }
      });
    }
    console.log(`✅ Updated ${products.length} products.`);

    // 2. Backfill Warehouses
    console.log('🏠 Processing Warehouses...');
    const warehouses = await prisma.warehouse.findMany();
    for (const w of warehouses) {
      await prisma.warehouse.update({
        where: { id: w.id },
        data: {
          isActive: w.isActive ?? true,
          type: w.type ?? 'STANDARD'
        }
      });
    }
    console.log(`✅ Updated ${warehouses.length} warehouses.`);

    // 3. Backfill Stock
    console.log('📉 Processing Stock records...');
    const stocks = await prisma.stock.findMany();
    for (const s of stocks) {
      await prisma.stock.update({
        where: { id: s.id },
        data: {
          quantity: s.quantity ?? 0,
          reservedQty: s.reservedQty ?? 0,
          damagedQty: s.damagedQty ?? 0,
        }
      });
    }
    console.log(`✅ Updated ${stocks.length} stock records.`);

    console.log('🎉 Backfill completed successfully!');
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
