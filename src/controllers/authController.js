const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwtUtils");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////////
exports.register = async (req, res) => {

  try {
    const { name, email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "USER",
        isActive: true,
      },
    });

    res.status(201).json({ success: true, user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //////////////////////////////////////////////////////
    // SUBSCRIPTION ADMIN LOGIN
    //////////////////////////////////////////////////////
    if (
      email === process.env.SUBSCRIPTION_ADMIN_EMAIL &&
      password === process.env.SUBSCRIPTION_ADMIN_PASSWORD
    ) {
      const token = generateToken({
        userId: "subscription-admin",
        email,
        role: "SUPER_ADMIN",
        isActive: true,
        isSubscriptionAdmin: true,
        employeeId: null
      });

      return res.json({
        success: true,
        token,
        businesses: [],
        activeBusinessId: null,
      });
    }

    //////////////////////////////////////////////////////
    // NORMAL USER LOGIN
    //////////////////////////////////////////////////////
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: true,
      },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    //////////////////////////////////////////////////////
    // AUTO ACTIVATE BUSINESS ONLY FOR INVITED USERS
    //////////////////////////////////////////////////////
    if (!user.activeBusinessId) {

      const invitedMembership = await prisma.businessUser.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (invitedMembership) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            activeBusinessId: invitedMembership.businessId,
          },
          include: { memberships: true },
        });
      }
    }

    //////////////////////////////////////////////////////
    // CHECK IF USER IS EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
      select: { id: true }
    });

    //////////////////////////////////////////////////////
    // GENERATE TOKEN
    //////////////////////////////////////////////////////
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || "USER",
      isActive: user.isActive ?? true,
      activeBusinessId: user.activeBusinessId,
      employeeId: employee?.id || null
    });

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    return res.json({
      success: true,
      token,
      businesses: user.memberships,
      activeBusinessId: user.activeBusinessId,
      employeeId: employee ? employee.id : null
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//////////////////////////////////////////////////////
// GET ALL USERS
//////////////////////////////////////////////////////
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        memberships: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET LOGGED-IN USER
//////////////////////////////////////////////////////
exports.getLoggedInUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    //////////////////////////////////////////////////////
    // FETCH USER + BUSINESSES
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,

      },
    });
    if (!user) {
      return errorResponse(res, "User not found");
    }

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    return successResponse(res, "User fetched successfully", user);

  } catch (error) {
    console.error(error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// UPDATE LOGGED-IN USER
//////////////////////////////////////////////////////
exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, password } = req.body;

    const data = {};
    if (email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== userId) {
        return errorResponse(res, "Email already exists");
      }
      data.email = email;
    }
    
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(data).length === 0) {
       return errorResponse(res, "No data provided to update");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      }
    });

    return successResponse(res, "User updated successfully", updatedUser);

  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse(res, "Internal server error");
  }
};