const prisma = require("../config/prisma");

module.exports = async (businessId) => {

  //////////////////////////////////////////////////////
  // GET SETTINGS
  //////////////////////////////////////////////////////

  const settings = await prisma.settings.findUnique({
    where: { businessId }
  });

  const format = settings?.invoiceFormat || "INV-YYYY-MM-DD-COUNT";

  //////////////////////////////////////////////////////
  // DATE VALUES
  //////////////////////////////////////////////////////

  const now = new Date();

  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");

  //////////////////////////////////////////////////////
  // TODAY START & END
  //////////////////////////////////////////////////////

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  //////////////////////////////////////////////////////
  // FIND TODAY'S LAST INVOICE
  //////////////////////////////////////////////////////

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      businessId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true }
  });

  //////////////////////////////////////////////////////
  // COUNT LOGIC
  //////////////////////////////////////////////////////

  let nextCount = 1;

  if (lastInvoice?.invoiceNumber) {

    const lastPart = lastInvoice.invoiceNumber.split("-").pop();
    const parsed = parseInt(lastPart);

    if (!isNaN(parsed)) {
      nextCount = parsed + 1;
    }
  }

  //////////////////////////////////////////////////////
  // BUILD INVOICE NUMBER
  //////////////////////////////////////////////////////

  let invoiceNumber = format;

  invoiceNumber = invoiceNumber.replace("YYYY", YYYY);
  invoiceNumber = invoiceNumber.replace("MM", MM);
  invoiceNumber = invoiceNumber.replace("DD", DD);
  invoiceNumber = invoiceNumber.replace("COUNT", nextCount);

  return invoiceNumber;
};