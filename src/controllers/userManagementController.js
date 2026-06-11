const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
//////////////////////////////////////////////////////
// GET BUSINESS USERS (NO ADMIN)
//////////////////////////////////////////////////////
const getBusinessUsers = async (req, res) => {
  try {
    const businessId = req.business.id;

    const users = await prisma.businessUser.findMany({
      where: {
        businessId,
        role: {
          name: {
            notIn: ["ADMIN", "SUPER_ADMIN"],
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        role: true,
        userPermissions: {   // ✅ FIXED
          include: { permission: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(
      res,
      users,
      "Users fetched successfully"
    );
  } catch (error) {
    console.error("getBusinessUsers error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// INVITE USER TO BUSINESS
//////////////////////////////////////////////////////
const inviteUser = async (req, res) => {
  try {
    const { email } = req.body;
    const businessId = req.business.id;

    //////////////////////////////////////////////////////
    // 1️⃣ CHECK USER EXISTS
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse(
        res,
        "User not found. Ask user to signup first.",
        404
      );
    }

    //////////////////////////////////////////////////////
    // 2️⃣ CHECK ALREADY MEMBER
    //////////////////////////////////////////////////////
    const existing = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId,
        },
      },
    });

    if (existing) {
      return errorResponse(res, "User already exists in business", 400);
    }

    //////////////////////////////////////////////////////
    // 3️⃣ FIND DEFAULT ROLE (AUTO)
    //////////////////////////////////////////////////////
    const defaultRole = await prisma.role.findFirst({
      where: {
        businessId,
        name: "User",   // ⭐ default role name
      },
    });

    if (!defaultRole) {
      return errorResponse(
        res,
        "Default role not found. Create 'User' role first.",
        400
      );
    }

    //////////////////////////////////////////////////////
    // 4️⃣ CREATE MEMBERSHIP
    //////////////////////////////////////////////////////
    const membership = await prisma.businessUser.create({
      data: {
        userId: user.id,
        businessId,
        roleId: defaultRole.id,
        isActive: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
    });

    return successResponse(res, membership, "User invited successfully");

  } catch (error) {
    console.error("inviteUser error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// TOGGLE USER STATUS
//////////////////////////////////////////////////////
const toggleUserStatus = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
    });

    if (!membership) {
      return errorResponse(res, "Membership not found", 404);
    }

    const updated = await prisma.businessUser.update({
      where: { id: membershipId },
      data: {
        isActive: !membership.isActive,
      },
    });

    return successResponse(
      res,
      updated,
      "User status updated"
    );
  } catch (error) {
    console.error("toggleUserStatus error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// ASSIGN DIRECT PERMISSION
//////////////////////////////////////////////////////
const assignDirectPermission = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { permissionId } = req.body;

    const exists = await prisma.userPermission.findUnique({
      where: {
        businessUserId_permissionId: {
          businessUserId: membershipId,
          permissionId,
        },
      },
    });

    if (exists) {
      return errorResponse(res, "Permission already assigned", 400);
    }

    const permission = await prisma.userPermission.create({
      data: {
        businessUserId: membershipId,
        permissionId,
      },
      include: {
        permission: true,
      },
    });

    return successResponse(
      res,
      permission,
      "Permission assigned"
    );
  } catch (error) {
    console.error("assignDirectPermission error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// CANCEL INVITE (SAFE VERSION)
//////////////////////////////////////////////////////
const cancelInvite = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const businessId = req.business.id;

    // 1️⃣ check membership exists
    const membership = await prisma.businessUser.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
      include: { role: true },
    });

    if (!membership) {
      return errorResponse(res, "Invite not found", 404);
    }

    // 2️⃣ prevent deleting admin
    if (membership.role.name === "Admin") {
      return errorResponse(
        res,
        "Cannot cancel admin membership",
        400
      );
    }

    // 3️⃣ SAFE DELETE (no crash)
    await prisma.businessUser.delete({
      where: { id: membershipId },
    });

    return successResponse(res, null, "Invite cancelled successfully");

  } catch (error) {
    console.error("cancelInvite error:", error);

    return errorResponse(
      res,
      error.message || "Internal server error",
      500
    );
  }
};

module.exports = {
  getBusinessUsers,
  inviteUser,
  toggleUserStatus,
  assignDirectPermission,
  cancelInvite,
};
