const prisma = require("../config/prisma");

exports.getTaxFields = async (req, res) => {
  try {
    const { customerId } = req.query;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: req.business.id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    let taxFields = [];

    if (customer.region === "INDIA") {
      taxFields = ["CGST", "SGST"];
    }

    if (customer.region === "UAE") {
      taxFields = ["VAT"];
    }

    res.json({
      success: true,
      region: customer.region,
      taxFields,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};