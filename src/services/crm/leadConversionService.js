const prisma = require("../../config/prisma");
const { logAudit } = require("../../utils/crmHelper");

/**
 * Handles transactional, duplicate-safe conversion of a Lead into Customer (Account), Contact, and optional Deal.
 * Enforces business boundaries and logs the conversion history.
 */
exports.convertLead = async (businessId, userId, leadId, options = {}) => {
  const {
    createDeal = false,
    dealName,
    dealAmount,
    expectedCloseDate,
    dealStage = "New",
    campaignId,
    // Duplicate handling flags
    existingAccountId, // If passed, links contact/deal to this account instead of creating a new one
    existingContactId,  // If passed, links to this contact instead of creating a new one
  } = options;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch lead details
    const lead = await tx.lead.findFirst({
      where: { id: leadId, businessId, isDeleted: false },
    });

    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.status === "CONVERTED") {
      throw new Error("Lead has already been converted");
    }

    // 2. Duplicate Account Detection & Resolution
    let accountId = existingAccountId;
    if (!accountId && lead.company) {
      const duplicateAccount = await tx.customer.findFirst({
        where: {
          businessId,
          company: { equals: lead.company, mode: "insensitive" },
          isDeleted: false,
        },
      });
      if (duplicateAccount) {
        // Automatically link to duplicate or resolve
        accountId = duplicateAccount.id;
      }
    }

    // 3. Create CRM Account (Customer) if no existing one was mapped or resolved
    let customer;
    if (!accountId) {
      customer = await tx.customer.create({
        data: {
          businessId,
          company: lead.company || lead.name,
          phone: lead.phone,
          website: lead.website,
          address: lead.city,
          city: lead.city,
          state: lead.state,
          country: lead.country,
          zipCode: lead.zipCode,
          region: "INDIA", // Default region required in schema
          crmStatus: "PROSPECT",
          accountType: "PROSPECT",
          leadId: lead.id,
        },
      });
      accountId = customer.id;
    } else {
      customer = await tx.customer.findUnique({ where: { id: accountId } });
    }

    // 4. Duplicate Contact Detection & Resolution
    let contactId = existingContactId;
    if (!contactId && lead.email) {
      const duplicateContact = await tx.customerContact.findFirst({
        where: {
          businessId,
          email: { equals: lead.email, mode: "insensitive" },
          isDeleted: false,
        },
      });
      if (duplicateContact) {
        contactId = duplicateContact.id;
      }
    }

    // 5. Create Contact if not mapped
    let contact;
    if (!contactId) {
      contact = await tx.customerContact.create({
        data: {
          businessId,
          customerId: accountId,
          fullName: lead.name,
          email: lead.email,
          phone: lead.phone,
          position: lead.position,
          isPrimary: true, // Lead is the primary contact
        },
      });
      contactId = contact.id;
    } else {
      contact = await tx.customerContact.findUnique({ where: { id: contactId } });
    }

    // 6. Optional Deal Creation
    let deal = null;
    if (createDeal) {
      deal = await tx.deal.create({
        data: {
          businessId,
          name: dealName || `${customer.company} - Deal`,
          amount: Number(dealAmount) || lead.leadValue || 0,
          customerId: accountId,
          contactId: contactId,
          stage: dealStage,
          probability: 10, // Initial stage probability
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          campaignId: campaignId || lead.campaignId,
          source: lead.source,
          assignedToId: lead.assignedToId,
        },
      });

      // Write Deal Stage History
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: "None",
          toStage: dealStage,
          changedById: lead.assignedToId,
        },
      });
    }

    // 7. Update Lead Status
    await tx.lead.update({
      where: { id: leadId },
      data: { status: "CONVERTED" },
    });

    // 8. Create Conversion Log record
    const conversionLog = await tx.leadConversionLog.create({
      data: {
        businessId,
        leadId,
        customerId: accountId,
        contactId,
        dealId: deal ? deal.id : null,
        convertedById: lead.assignedToId,
      },
    });

    // 9. Reusable audit logger hook
    await logAudit(businessId, {
      userId,
      action: "CONVERT_LEAD",
      moduleName: "Lead",
      recordId: leadId,
      details: { accountId, contactId, dealId: deal?.id },
    });

    return {
      success: true,
      leadId,
      accountId,
      contactId,
      dealId: deal ? deal.id : null,
      conversionLogId: conversionLog.id,
    };
  });
};
