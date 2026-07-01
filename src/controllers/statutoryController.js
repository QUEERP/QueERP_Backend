const prisma = require("../config/prisma");

exports.getDashboardSummary = async (req, res) => {
    try {
        const businessId = req.business ? req.business.id : req.headers['x-business-id'];
        
        if (!businessId) {
            return res.status(400).json({ success: false, message: "Business ID is required" });
        }

        let totalSales = 0;
        let outputVat = 0;
        let taxableSales = 0;
        let zeroRatedSales = 0;
        let exemptSales = 0;

        // Try to aggregate invoices
        try {
            const invoices = await prisma.invoice.findMany({
                where: { businessId, isDeleted: false, status: { not: "CANCELLED" } },
                select: { grandTotal: true, totalTax: true, vatType: true, subtotal: true }
            });

            for (const inv of invoices) {
                totalSales += (inv.grandTotal || 0);
                outputVat += (inv.totalTax || 0);
                
                const type = (inv.vatType || "").toLowerCase();
                if (type.includes("zero")) {
                    zeroRatedSales += (inv.subtotal || 0);
                } else if (type.includes("exempt")) {
                    exemptSales += (inv.subtotal || 0);
                } else {
                    taxableSales += (inv.subtotal || 0);
                }
            }
        } catch (e) {
            console.error("Error fetching invoices for statutory stats:", e);
        }

        let totalPurchases = 0;
        let inputVat = 0;

        // Try to aggregate bills
        try {
            const bills = await prisma.bill.findMany({
                where: { businessId },
                select: { totalAmount: true, tax: true }
            });

            for (const bill of bills) {
                totalPurchases += (bill.totalAmount || 0);
                inputVat += (bill.tax || 0);
            }
        } catch (e) {
             console.error("Error fetching bills for statutory stats:", e);
        }

        const vatPayable = outputVat > inputVat ? outputVat - inputVat : 0;
        const vatRefund = inputVat > outputVat ? inputVat - outputVat : 0;
        
        let recentReports = [];
        try {
            // Check if StatutoryReport model exists
            if (prisma.statutoryReport) {
                recentReports = await prisma.statutoryReport.findMany({
                    where: { businessId },
                    orderBy: { generatedAt: 'desc' },
                    take: 5
                });
            }
        } catch (e) {
            console.log("Could not fetch recent statutory reports.");
        }

        const stats = {
            totalSales,
            totalPurchases,
            outputVat,
            inputVat,
            vatPayable,
            vatRefund,
            taxableSales,
            zeroRatedSales,
            exemptSales,
            recentReports
        };

        return res.status(200).json({ success: true, data: stats });

    } catch (error) {
        console.error("Error fetching statutory dashboard summary:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
