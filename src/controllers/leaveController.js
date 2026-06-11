const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE LEAVE (EMPLOYEE SELF REQUEST)
//////////////////////////////////////////////////////
exports.createLeave = async (req, res) => {

  try {

    const businessId = req.business.id;

    // ⭐ EMPLOYEE ID FROM TOKEN
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required"
      });
    }

    const { leaveCode, date, duration } = req.body;

    if (!leaveCode || !date || !duration) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const leaveDate = new Date(date);

    //////////////////////////////////////////////////////
    // CHECK EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    //////////////////////////////////////////////////////
    // PREVENT MULTIPLE LEAVES SAME DATE
    //////////////////////////////////////////////////////
    const startOfDay = new Date(leaveDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(leaveDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingLeave = await prisma.leave.findFirst({
      where: {
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingLeave) {
      return res.status(400).json({
        success: false,
        message: "You already applied leave on this date"
      });
    }

    //////////////////////////////////////////////////////
    // LEAVE BALANCE CHECK
    //////////////////////////////////////////////////////
    let leaveBalance = { ...(employee.leaveBalance || {}) };

    const deduction = duration === "HALF" ? 0.5 : 1;

    if (leaveCode !== "LWP") {

      if (leaveBalance[leaveCode] === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid leave type"
        });
      }

      if (leaveBalance[leaveCode] < deduction) {
        return res.status(400).json({
          success: false,
          message: `${leaveCode} balance finished. Use LWP`
        });
      }

      leaveBalance[leaveCode] -= deduction;

    }

    //////////////////////////////////////////////////////
    // CREATE LEAVE
    //////////////////////////////////////////////////////
    const leave = await prisma.leave.create({
      data: {
        businessId,
        employeeId,
        leaveCode,
        duration,
        date: leaveDate
      }
    });

    //////////////////////////////////////////////////////
    // UPDATE BALANCE
    //////////////////////////////////////////////////////
    if (leaveCode !== "LWP") {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { leaveBalance }
      });
    }

    res.json({
      success: true,
      message: "Leave created successfully",
      data: leave,
      updatedLeaveBalance: leaveBalance
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET ALL LEAVES
//////////////////////////////////////////////////////
exports.getLeaves = async (req, res) => {

  try {

    const businessId = req.business.id;

    const leaves = await prisma.leave.findMany({

      where: { businessId },

      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true
          }
        }
      },

      orderBy: {
        date: "desc"
      }

    });

    res.json({
      success: true,
      data: leaves
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

exports.updateLeaveStatus = async (req,res)=>{

  try{

    const businessId = req.business.id;
    const leaveId = req.params.id;
    const { status } = req.body;

    if(!["APPROVED","REJECTED"].includes(status)){
      return res.status(400).json({
        success:false,
        message:"Invalid status"
      });
    }

    const leave = await prisma.leave.findFirst({
      where:{
        id: leaveId,
        businessId
      }
    });

    if(!leave){
      return res.status(404).json({
        success:false,
        message:"Leave not found"
      });
    }

    const updatedLeave = await prisma.leave.update({
      where:{ id:leaveId },
      data:{ status }
    });

    res.json({
      success:true,
      message:`Leave ${status.toLowerCase()} successfully`,
      data:updatedLeave
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET MY LEAVES (LOGGED IN EMPLOYEE)
//////////////////////////////////////////////////////
exports.getMyLeaves = async (req,res)=>{

  try{

    const employeeId = req.user.employeeId;

    if(!employeeId){
      return res.status(401).json({
        success:false,
        message:"Employee authentication required"
      });
    }

    const leaves = await prisma.leave.findMany({

      where:{
        employeeId
      },

      orderBy:{
        date:"desc"
      }

    });

    res.json({
      success:true,
      data:leaves
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};