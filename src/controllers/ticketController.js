const prisma = require("../config/prisma");

exports.getTickets = async (req, res) => {
  try {
    const { customerId, projectId, warrantyId, amcId } = req.query;
    const where = { businessId: req.business.id };
    if (customerId) where.customerId = customerId;
    if (projectId) where.projectId = projectId;
    if (warrantyId) where.warrantyId = warrantyId;
    if (amcId) where.amcId = amcId;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        customer: { select: { id: true, company: true } },
        assignedEngineer: { select: { id: true, name: true } },
        amc: { select: { id: true, amcNumber: true } },
        warranty: { select: { id: true, warrantyNumber: true } },
        comments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const count = await prisma.ticket.count({ where: { businessId: req.business.id } });
    const ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
    
    const ticket = await prisma.ticket.create({
      data: {
        ...req.body,
        ticketNumber,
        businessId: req.business.id,
        expectedResolution: req.body.expectedResolution ? new Date(req.body.expectedResolution) : null
      }
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.expectedResolution) data.expectedResolution = new Date(data.expectedResolution);
    
    // Auto set resolvedAt if status changes to RESOLVED or CLOSED
    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
      if (current.status !== 'RESOLVED' && current.status !== 'CLOSED') {
        data.resolvedAt = new Date();
      }
    } else {
      data.resolvedAt = null;
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data
    });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
