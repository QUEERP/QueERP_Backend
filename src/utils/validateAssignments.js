const prisma = require("../config/prisma");

exports.validateAssignments = async (businessUserIds, employeeIds, businessId) => {
  if (businessUserIds?.length) {
    const users = await prisma.businessUser.findMany({
      where: { id: { in: businessUserIds }, businessId },
    });

    if (users.length !== businessUserIds.length) {
      throw new Error("Invalid business users");
    }
  }

  if (employeeIds?.length) {
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, businessId },
    });

    if (employees.length !== employeeIds.length) {
      throw new Error("Invalid employees");
    }
  }
};