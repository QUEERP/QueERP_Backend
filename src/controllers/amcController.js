const prisma = require("../config/prisma");

exports.getAMCs = async (req, res) => {
  try {
    const { customerId, projectId } = req.query;
    const where = { businessId: req.business.id };
    if (customerId) where.customerId = customerId;
    if (projectId) where.projectId = projectId;

    const amcs = await prisma.aMC.findMany({
      where,
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        customer: { select: { id: true, company: true } },
        assignedEngineer: { select: { id: true, name: true } },
        warranty: { select: { id: true, warrantyNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, amcs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAMC = async (req, res) => {
  try {
    const count = await prisma.aMC.count({ where: { businessId: req.business.id } });
    const amcNumber = `AMC-${String(count + 1).padStart(5, '0')}`;
    
    const { contractValue, ...rest } = req.body;

    const amc = await prisma.aMC.create({
      data: {
        ...rest,
        amcNumber,
        contractValue: contractValue ? parseFloat(contractValue) : 0,
        businessId: req.business.id,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        renewalDate: req.body.renewalDate ? new Date(req.body.renewalDate) : null
      }
    });
    res.status(201).json({ success: true, amc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAMC = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.renewalDate) data.renewalDate = new Date(data.renewalDate);
    if (data.contractValue !== undefined) data.contractValue = parseFloat(data.contractValue);

    const amc = await prisma.aMC.update({
      where: { id: req.params.id },
      data
    });
    res.json({ success: true, amc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAMC = async (req, res) => {
  try {
    await prisma.aMC.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
