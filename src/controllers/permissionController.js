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

    let permissions = await prisma.permission.findMany({
      where: {
        module: { name: module },
        action: { in: actions },
      },
    });

    // Auto-create missing permissions (and module if needed)
    if (permissions.length < actions.length) {
      let mod = await prisma.module.findUnique({ where: { name: module } });
      if (!mod) {
        mod = await prisma.module.create({ data: { name: module } });
      }
      
      for (const action of actions) {
        const exists = permissions.find(p => p.action === action);
        if (!exists) {
          const newPerm = await prisma.permission.create({
            data: {
              moduleId: mod.id,
              action: action,
            }
          });
          permissions.push(newPerm);
        }
      }
    }

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