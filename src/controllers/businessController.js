const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const businessSetupService = require("../services/BusinessSetupService");

//////////////////////////////////////////////////////
// CREATE BUSINESS
//////////////////////////////////////////////////////
exports.createBusiness = async (req, res) => {
  try {
    const { name, country } = req.body;
    const userId = req.user.userId;

    if (!name || !country) {
      return errorResponse(res, "Business Name and Country are required.", 400);
    }

    const business = await businessSetupService.setupNewBusiness(name, country, userId);

    return successResponse(res, business, "Business created", 201);
  } catch (error) {
    console.error("Create business error:", error);
    return errorResponse(res, error.message, 500);
  }
};


//////////////////////////////////////////////////////
// GET COMPLETE DASHBOARD DATA
//////////////////////////////////////////////////////
exports.getMyData = async (req, res) => {
  try {
    const userId = req.user.userId;

    //////////////////////////////////////////////////////
    // 1️⃣ LOGIN USER
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        activeBusinessId: true,
      },
    });

    //////////////////////////////////////////////////////
    // 2️⃣ BUSINESSES CREATED BY LOGIN USER (OWNER)
    //////////////////////////////////////////////////////
    const ownedBusinesses = await prisma.business.findMany({
      where: { ownerId: userId },

      include: {
        settings: true,

        customers: true,

        invoices: {
          include: { customer: true },
          orderBy: { createdAt: "desc" },
        },

        //////////////////////////////////////////////////////
        // USERS + PERMISSIONS
        //////////////////////////////////////////////////////
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },

            userPermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    //////////////////////////////////////////////////////
    // 3️⃣ BUSINESSES WHERE USER IS MEMBER
    //////////////////////////////////////////////////////
    const memberships = await prisma.businessUser.findMany({
      where: {
        userId,
        isActive: true,
      },

      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },

        userPermissions: {
          include: {
            permission: true,
          },
        },

        business: {
          include: {
            settings: true,

            customers: true,

            invoices: {
              include: { customer: true },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    //////////////////////////////////////////////////////
    // REMOVE DUPLICATE BUSINESSES
    //////////////////////////////////////////////////////
    const ownedIds = ownedBusinesses.map((b) => b.id);

    const memberBusinesses = memberships
      .map((m) => ({
        businessUserId: m.id,

        role: m.role,
        userPermissions: m.userPermissions,

        business: m.business,
      }))
      .filter((m) => !ownedIds.includes(m.business.id));

    //////////////////////////////////////////////////////
    // FINAL RESPONSE
    //////////////////////////////////////////////////////
    return res.status(200).json({
      success: true,

      user,

      ownedBusinesses,

      memberBusinesses,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const business = await prisma.business.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            users: {
              some: {
                userId: userId,
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        users:true,
        settings: true,
        customers: true,
        invoices: {
          include: { customer: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!business) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this business",
      });
    }
const membership = await prisma.businessUser.findFirst({
      where: {
        businessId: id,
        userId: userId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    //////////////////////////////////////////////////////
    // 3️⃣ Merge permissions (ROLE + DIRECT)
    //////////////////////////////////////////////////////
    let finalPermissions = [];

    if (membership) {
      const rolePermissions =
        membership.role?.rolePermissions.map(
          (rp) => `${rp.permission.module}:${rp.permission.action}`
        ) || [];

      const directPermissions =
        membership.userPermissions.map(
          (up) => `${up.permission.module}:${up.permission.action}`
        ) || [];

      finalPermissions = [...new Set([...rolePermissions, ...directPermissions])];
    }

    //////////////////////////////////////////////////////
    // 4️⃣ Return response
    //////////////////////////////////////////////////////
    return res.status(200).json({
      success: true,
      business,
      Role: membership?.role || null,
      Permissions: finalPermissions,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


//////////////////////////////////////////////////////
// GET ALL BUSINESS USERS (FOR DROPDOWNS)
//////////////////////////////////////////////////////
exports.getBusinessUsersList = async (req, res) => {
  try {
    const { businessId } = req.params;

    const memberships = await prisma.businessUser.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        user: true,
        role: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const usersList = memberships.map((m) => ({
      id: m.user.id, // CRITICAL: returning the global User.id for relations
      name: m.user.name,
      email: m.user.email,
      role: m.role?.name || "Member",
      department: "General", // Placeholder as department usually lives in Employee
      avatar: null,
      status: m.isActive ? "Active" : "Inactive",
    }));

    return res.status(200).json({
      success: true,
      users: usersList,
    });
  } catch (error) {
    console.error("getBusinessUsersList error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
