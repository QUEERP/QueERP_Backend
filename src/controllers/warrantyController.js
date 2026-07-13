const prisma = require("../config/prisma");

exports.getWarranties = async (req, res) => {
  try {
    const warranties = await prisma.warranty.findMany({
      where: { businessId: req.business.id },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        customer: { select: { id: true, company: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, warranties });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createWarranty = async (req, res) => {
  try {
    const count = await prisma.warranty.count({ where: { businessId: req.business.id } });
    const warrantyNumber = `WAR-${String(count + 1).padStart(5, '0')}`;
    
    const warranty = await prisma.warranty.create({
      data: {
        ...req.body,
        warrantyNumber,
        businessId: req.business.id,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      }
    });
    res.status(201).json({ success: true, warranty });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateWarranty = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const warranty = await prisma.warranty.update({
      where: { id: req.params.id },
      data
    });
    res.json({ success: true, warranty });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteWarranty = async (req, res) => {
  try {
    await prisma.warranty.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
