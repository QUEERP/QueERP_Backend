const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE MODULE
//////////////////////////////////////////////////////
exports.createModule = async (req, res) => {
  try {
    const { name, actions } = req.body;

    if (!name || !actions?.length) {
      return res.status(400).json({
        success: false,
        message: "Name and actions required",
      });
    }

    const module = await prisma.module.create({
      data: { name },
    });

    await prisma.permission.createMany({
      data: actions.map(action => ({
        moduleId: module.id,
        action,
      })),
      skipDuplicates: true,
    });

    return res.json({
      success: true,
      message: "Module created successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Create module failed",
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL MODULES
//////////////////////////////////////////////////////
exports.getModules = async (req, res) => {
  try {

    const modules = await prisma.module.findMany({
      include: {
        permissions: {
          select: { action: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = modules.map(m => ({
      id: m.id,
      name: m.name,
      actions: m.permissions.map(p => p.action),
    }));

    res.json({
      success: true,
      data: formatted,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Fetch modules failed",
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE MODULE
//////////////////////////////////////////////////////
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, actions } = req.body;

    //////////////////////////////////////////////////
    // GET MODULE WITH PERMISSIONS
    //////////////////////////////////////////////////
    const moduleData = await prisma.module.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!moduleData) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const permissionIds = moduleData.permissions.map(p => p.id);

    //////////////////////////////////////////////////
    // UPDATE NAME (OPTIONAL)
    //////////////////////////////////////////////////
    if (name) {
      await prisma.module.update({
        where: { id },
        data: { name },
      });
    }

    //////////////////////////////////////////////////
    // UPDATE ACTIONS
    //////////////////////////////////////////////////
    if (actions?.length) {

      ////////////////////////////////////////////////
      // ⭐ DELETE USER PERMISSIONS (IF EXISTS)
      ////////////////////////////////////////////////
      await prisma.userPermission.deleteMany({
        where: {
          permissionId: { in: permissionIds },
        },
      });

      ////////////////////////////////////////////////
      // ⭐ DELETE ROLE PERMISSIONS
      ////////////////////////////////////////////////
      await prisma.rolePermission.deleteMany({
        where: {
          permissionId: { in: permissionIds },
        },
      });

      ////////////////////////////////////////////////
      // DELETE OLD PERMISSIONS
      ////////////////////////////////////////////////
      await prisma.permission.deleteMany({
        where: {
          id: { in: permissionIds },
        },
      });

      ////////////////////////////////////////////////
      // CREATE NEW PERMISSIONS
      ////////////////////////////////////////////////
      await prisma.permission.createMany({
        data: actions.map(action => ({
          moduleId: id,
          action,
        })),
      });
    }

    return res.json({
      success: true,
      message: "Module updated successfully",
    });

  } catch (error) {
    console.error("UPDATE MODULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};
//////////////////////////////////////////////////////
// DELETE MODULE
//////////////////////////////////////////////////////
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get all permission IDs for this module
    const permissions = await prisma.permission.findMany({
      where: { moduleId: id },
      select: { id: true }
    });
    const permissionIds = permissions.map(p => p.id);

    // 2. Delete RolePermissions and UserPermissions first to avoid FK errors
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: permissionIds } }
    });
    await prisma.userPermission.deleteMany({
      where: { permissionId: { in: permissionIds } }
    });

    // 3. Now delete the Permissions
    await prisma.permission.deleteMany({
      where: { moduleId: id },
    });

    // 4. Finally delete the Module
    await prisma.module.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Module deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};