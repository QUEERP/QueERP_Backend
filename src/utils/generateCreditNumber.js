const prisma = require("../config/prisma");

const generateCreditNumber = async (businessId, type = "INVOICE") => {
  const prefix = type === "BILL" ? "BCN" : "CN";

  const last = await prisma.creditNote.findFirst({
    where: { businessId, type },
    orderBy: { createdAt: "desc" },
    select: { creditNumber: true },
  });

  let next = 1;

  if (last?.creditNumber) {
    const lastNum = parseInt(last.creditNumber.split("-")[1]);
    next = lastNum + 1;
  }

  return `${prefix}-${String(next).padStart(3, "0")}`;
};

module.exports = generateCreditNumber;