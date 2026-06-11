const warehouseService = require("../../services/inventory/warehouse.service");

exports.createWarehouse = async (req, res) => {
  try {
    const warehouse = await warehouseService.createWarehouse(
      req.business.id,
      req.user.id,
      req.user.email,
      req.body
    );
    res.status(201).json({ success: true, warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await warehouseService.getWarehouses(req.business.id, req.query);
    res.json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await warehouseService.getWarehouseById(req.business.id, req.params.id);
    res.json({ success: true, warehouse });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await warehouseService.updateWarehouse(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id,
      req.body
    );
    res.json({ success: true, warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    await warehouseService.deleteWarehouse(
      req.business.id,
      req.user.id,
      req.user.email,
      req.params.id
    );
    res.json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
