const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// ASSIGN PERMISSIONS
//////////////////////////////////////////////////////
exports.assignCrudPermissionsToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { module, actions } = req.body;
    const businessId = req.business.id;

    if (!module || !Array.isArray(actions)) {
      return errorResponse(res, "module & actions required", 400);
    }

    const membership = await prisma.businessUser.findFirst({
      where: { userId, businessId, isActive: true },
    });

    if (!membership)
      return errorResponse(res, "User not in business", 404);

    const permissions = await prisma.permission.findMany({
      where: {
        module: { name: module },
        action: { in: actions },
      },
    });

    if (!permissions.length)
      return errorResponse(res, "Permissions not found", 404);

    const data = permissions.map((p) => ({
      businessUserId: membership.id,
      permissionId: p.id,
    }));

    await prisma.userPermission.createMany({
      data,
      skipDuplicates: true,
    });

    return successResponse(res, permissions, "Permissions assigned");
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// REMOVE PERMISSIONS
//////////////////////////////////////////////////////
exports.removeCrudPermissionsFromUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { module, actions } = req.body;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: { userId, businessId },
    });

    if (!membership)
      return errorResponse(res, "User not found", 404);

    const permissions = await prisma.permission.findMany({
      where: {
        module: { name: module },
        action: { in: actions },
      },
    });

    await prisma.userPermission.deleteMany({
      where: {
        businessUserId: membership.id,
        permissionId: { in: permissions.map((p) => p.id) },
      },
    });

    return successResponse(res, null, "Permissions removed");
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET USER PERMISSIONS
//////////////////////////////////////////////////////
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: { userId, businessId },
      include: {
        userPermissions: {
          include: {
            permission: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (!membership)
      return errorResponse(res, "User not found", 404);

    const result = membership.userPermissions.map((up) => ({
      module: up.permission.module.name,
      action: up.permission.action,
    }));

    return successResponse(res, result, "User permissions fetched");
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};