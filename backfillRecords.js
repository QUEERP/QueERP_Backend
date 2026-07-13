const prisma = require('./src/config/prisma.js');

async function main() {
  console.log('Starting backwards compatibility backfill for ALL records...');

  // 1. Fetch all Leads
  const leads = await prisma.lead.findMany();
  console.log(`Found ${leads.length} total leads/inquiries to process.`);

  // 2. Fetch all Customers to match against
  const customers = await prisma.customer.findMany();

  let updatedCount = 0;
  
  // Group counts by businessId for generating inquiry numbers sequentially
  const businessInquiryCounts = {};

  // Find current max inquiry number per business to continue from it
  for (const lead of leads) {
    if (lead.inquiryNumber) {
      const match = lead.inquiryNumber.match(/INQ-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!businessInquiryCounts[lead.businessId] || num > businessInquiryCounts[lead.businessId]) {
          businessInquiryCounts[lead.businessId] = num;
        }
      }
    }
  }

  for (const lead of leads) {
    const updates = {};
    let needsUpdate = false;

    // A. Link to Customer if missing
    if (!lead.customerId) {
      // Find matching customer within the same business
      const matchingCustomer = customers.find(c => 
        c.businessId === lead.businessId &&
        (
          (lead.company && c.company && c.company.toLowerCase() === lead.company.toLowerCase()) ||
          (lead.name && c.company && c.company.toLowerCase() === lead.name.toLowerCase()) ||
          (lead.email && c.email && c.email.toLowerCase() === lead.email.toLowerCase()) ||
          (lead.phone && c.phone && c.phone === lead.phone)
        )
      );

      if (matchingCustomer) {
        updates.customerId = matchingCustomer.id;
        needsUpdate = true;
        console.log(`[Link] Linked Lead "${lead.inquiryTitle || lead.company || lead.name}" to Customer "${matchingCustomer.company}"`);
      }
    }

    // Only auto-upgrade to Inquiry if they are linked to a customer or have an inquiry Title
    // This ensures we don't accidentally upgrade random CRM leads, though the user wants everything for that customer
    if (lead.customerId || updates.customerId || lead.inquiryTitle) {
      
      // B. Generate Inquiry Number if missing
      if (!lead.inquiryNumber) {
        if (!businessInquiryCounts[lead.businessId]) {
          businessInquiryCounts[lead.businessId] = 0;
        }
        businessInquiryCounts[lead.businessId] += 1;
        const newInqNumber = `INQ-${String(businessInquiryCounts[lead.businessId]).padStart(3, '0')}`;
        updates.inquiryNumber = newInqNumber;
        needsUpdate = true;
        console.log(`[Number] Generated ${newInqNumber} for Lead`);
      }

      // C. Generate Inquiry Title if missing (so it passes the { not: null } filter in the dropdown)
      if (!lead.inquiryTitle) {
        updates.inquiryTitle = `${lead.company || lead.name} - Legacy Inquiry`;
        needsUpdate = true;
        console.log(`[Title] Assigned legacy title for Lead`);
      }
    }

    // Execute update if required
    if (needsUpdate) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updates
      });
      updatedCount++;
    }
  }

  console.log(`Backfill complete. Successfully updated ${updatedCount} existing records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
