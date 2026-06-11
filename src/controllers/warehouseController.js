const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE
//////////////////////////////////////////////////////
exports.createWarehouse = async (req, res) => {
  try {
    const { name, address, city, country } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name required",
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        address,
        city,
        country,
        businessId: req.business.id,
      },
    });

    res.status(201).json({
      success: true,
      warehouse,
    });

  } catch (error) {
    console.error("createWarehouse error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//////////////////////////////////////////////////////
// GET ALL
//////////////////////////////////////////////////////
exports.getWarehouses = async (req, res) => {
  try {
    const data = await prisma.warehouse.findMany({
      where: { businessId: req.business.id },
    });

    res.json({ success: true, warehouses: data });
  } catch (error) {
    console.error("getWarehouses error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
exports.updateWarehouse = async (req, res) => {
  const updated = await prisma.warehouse.updateMany({
    where: {
      id: req.params.id,
      businessId: req.business.id,
    },
    data: req.body,
  });

  if (updated.count === 0) {
    return res.status(404).json({
      success: false,
      message: "Warehouse not found",
    });
  }

  res.json({ success: true, message: "Updated" });
};

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
exports.deleteWarehouse = async (req, res) => {
  const deleted = await prisma.warehouse.deleteMany({
    where: {
      id: req.params.id,
      businessId: req.business.id,
    },
  });

  if (deleted.count === 0) {
    return res.status(404).json({
      success: false,
      message: "Warehouse not found",
    });
  }

  res.json({ success: true, message: "Deleted" });
};