const prisma = require("../../config/prisma");

/**
 * Enterprise CRM Reports & Analytics Aggregation Service.
 * Implements highly performant database queries with multi-tenant isolation.
 */
class CrmReportService {
  /**
   * Generates Lead Funnel Conversion & Stage Distribution analytics
   */
  async getLeadFunnelReport(businessId) {
    // 1. Stage Distribution
    const leadStages = await prisma.lead.groupBy({
      by: ["status"],
      where: { businessId, isDeleted: false },
      _count: { id: true },
      _sum: { leadValue: true },
    });

    // 2. Conversion Speeds & Rates
    const totalLeads = await prisma.lead.count({
      where: { businessId, isDeleted: false },
    });

    const convertedLeads = await prisma.lead.count({
      where: { businessId, status: "CONVERTED", isDeleted: false },
    });

    const logs = await prisma.leadConversionLog.findMany({
      where: { businessId },
      include: { lead: { select: { createdAt: true } } },
    });

    let averageConversionDays = 0;
    if (logs.length > 0) {
      const totalDays = logs.reduce((sum, log) => {
        const timeDiff = new Date(log.convertedAt).getTime() - new Date(log.lead.createdAt).getTime();
        return sum + timeDiff / (1000 * 60 * 60 * 24);
      }, 0);
      averageConversionDays = totalDays / logs.length;
    }

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      convertedLeads,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      averageConversionDays: parseFloat(averageConversionDays.toFixed(1)),
      stages: leadStages.map((s) => ({
        stage: s.status,
        count: s._count.id,
        totalValue: s._sum.leadValue || 0,
      })),
    };
  }

  /**
   * Generates Revenue Forecasting based on Deal stages, expectation dates and stage probabilities
   */
  async getRevenueForecast(businessId) {
    const deals = await prisma.deal.findMany({
      where: { businessId, isDeleted: false, status: "OPEN" },
      select: {
        id: true,
        amount: true,
        probability: true,
        expectedCloseDate: true,
        stage: true,
      },
    });

    let totalPipelineValue = 0;
    let totalForecastedRevenue = 0;

    const monthlyBuckets = {};

    deals.forEach((d) => {
      const amount = d.amount || 0;
      const prob = d.probability || 0;
      const weightedVal = amount * (prob / 100);

      totalPipelineValue += amount;
      totalForecastedRevenue += weightedVal;

      if (d.expectedCloseDate) {
        const dateObj = new Date(d.expectedCloseDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const bucketKey = `${year}-${month}`;

        if (!monthlyBuckets[bucketKey]) {
          monthlyBuckets[bucketKey] = { pipelineValue: 0, forecastedRevenue: 0, dealCount: 0 };
        }
        monthlyBuckets[bucketKey].pipelineValue += amount;
        monthlyBuckets[bucketKey].forecastedRevenue += weightedVal;
        monthlyBuckets[bucketKey].dealCount += 1;
      }
    });

    const timeBuckets = Object.keys(monthlyBuckets)
      .sort()
      .map((key) => ({
        month: key,
        ...monthlyBuckets[key],
        pipelineValue: parseFloat(monthlyBuckets[key].pipelineValue.toFixed(2)),
        forecastedRevenue: parseFloat(monthlyBuckets[key].forecastedRevenue.toFixed(2)),
      }));

    return {
      totalPipelineValue,
      totalForecastedRevenue: parseFloat(totalForecastedRevenue.toFixed(2)),
      activeDealsCount: deals.length,
      forecastTimeline: timeBuckets,
    };
  }

  /**
   * Generates Activity Stats breakdown by type, outcome and sales representative
   */
  async getActivityStats(businessId) {
    // Activities breakdown by Type
    const byType = await prisma.activity.groupBy({
      by: ["type"],
      where: { businessId, isDeleted: false },
      _count: { id: true },
    });

    // Activities breakdown by Status
    const byStatus = await prisma.activity.groupBy({
      by: ["status"],
      where: { businessId, isDeleted: false },
      _count: { id: true },
    });

    // Activities by Sales Agent/BusinessUser
    const byAssignee = await prisma.activity.findMany({
      where: { businessId, isDeleted: false },
      select: {
        id: true,
        type: true,
        status: true,
        assignedTo: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    const assigneeCounts = {};
    byAssignee.forEach((act) => {
      const name = act.assignedTo?.user?.name || "Unassigned";
      if (!assigneeCounts[name]) {
        assigneeCounts[name] = { total: 0, CALL: 0, MEETING: 0, TASK: 0, EMAIL: 0, completed: 0 };
      }
      assigneeCounts[name].total += 1;
      if (act.type in assigneeCounts[name]) {
        assigneeCounts[name][act.type] += 1;
      }
      if (act.status === "Completed") {
        assigneeCounts[name].completed += 1;
      }
    });

    const representativeStats = Object.keys(assigneeCounts).map((name) => ({
      name,
      ...assigneeCounts[name],
    }));

    return {
      activityCountByType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      activityCountByStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      representativeStats,
    };
  }

  /**
   * Generates Sales Pipeline and Rep Performance analytics
   */
  async getSalesPipelinePerformance(businessId) {
    const deals = await prisma.deal.findMany({
      where: { businessId, isDeleted: false },
      include: {
        assignedTo: { select: { user: { select: { name: true } } } },
      },
    });

    const totalCount = deals.length;
    const wonDeals = deals.filter((d) => d.status === "WON" || d.stage === "Won");
    const lostDeals = deals.filter((d) => d.status === "LOST" || d.stage === "Lost");
    const openDeals = deals.filter((d) => d.status === "OPEN" && d.stage !== "Won" && d.stage !== "Lost");

    const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
    const lostValue = lostDeals.reduce((sum, d) => sum + d.amount, 0);
    const openValue = openDeals.reduce((sum, d) => sum + d.amount, 0);

    const winRatio = totalCount > 0 ? (wonDeals.length / totalCount) * 100 : 0;
    const avgDealSize = totalCount > 0 ? deals.reduce((sum, d) => sum + d.amount, 0) / totalCount : 0;

    // Rep revenue performance
    const repSales = {};
    deals.forEach((d) => {
      const repName = d.assignedTo?.user?.name || "Unassigned";
      if (!repSales[repName]) {
        repSales[repName] = { wonValue: 0, wonCount: 0, totalCount: 0, totalValue: 0 };
      }
      repSales[repName].totalCount += 1;
      repSales[repName].totalValue += d.amount;
      if (d.status === "WON" || d.stage === "Won") {
        repSales[repName].wonCount += 1;
        repSales[repName].wonValue += d.amount;
      }
    });

    const representativeLeaderboard = Object.keys(repSales).map((name) => ({
      representativeName: name,
      ...repSales[name],
    })).sort((a, b) => b.wonValue - a.wonValue);

    // Deals by Stage breakdown
    const stageBreakdown = {};
    deals.forEach((d) => {
      if (!stageBreakdown[d.stage]) {
        stageBreakdown[d.stage] = { count: 0, value: 0 };
      }
      stageBreakdown[d.stage].count += 1;
      stageBreakdown[d.stage].value += d.amount;
    });

    const stages = Object.keys(stageBreakdown).map((stage) => ({
      stage,
      count: stageBreakdown[stage].count,
      totalValue: stageBreakdown[stage].value,
    }));

    return {
      pipelineMetrics: {
        totalDeals: totalCount,
        openDealsCount: openDeals.length,
        wonDealsCount: wonDeals.length,
        lostDealsCount: lostDeals.length,
        pipelineValue: openValue,
        wonRevenue: wonValue,
        lostRevenue: lostValue,
        winRatio: parseFloat(winRatio.toFixed(2)),
        averageDealSize: parseFloat(avgDealSize.toFixed(2)),
      },
      dealsByStage: stages,
      representativeLeaderboard,
    };
  }

  /**
   * Generates Marketing Campaigns performance & ROI analytics
   */
  async getCampaignRoiReport(businessId) {
    const campaigns = await prisma.campaign.findMany({
      where: { businessId, isDeleted: false },
      include: {
        leads: { select: { id: true, status: true } },
        deals: { select: { id: true, amount: true, status: true, stage: true } },
      },
    });

    return campaigns.map((camp) => {
      const budget = camp.budget || 0;
      const actualCost = camp.actualCost || budget || 0;
      const wonDeals = camp.deals.filter((d) => d.status === "WON" || d.stage === "Won");
      const wonRevenue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
      const totalRevenue = camp.deals.reduce((sum, d) => sum + d.amount, 0);

      const roiPercentage = actualCost > 0 ? ((wonRevenue - actualCost) / actualCost) * 100 : 0;

      return {
        campaignId: camp.id,
        name: camp.name,
        type: camp.type,
        status: camp.status,
        budget,
        actualCost,
        leadsGenerated: camp.leads.length,
        dealsGenerated: camp.deals.length,
        wonDealsCount: wonDeals.length,
        wonRevenue: parseFloat(wonRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        roiPercentage: parseFloat(roiPercentage.toFixed(2)),
      };
    });
  }
}

module.exports = new CrmReportService();
