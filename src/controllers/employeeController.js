const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

//////////////////////////////////////////////////////
// CREATE EMPLOYEE
//////////////////////////////////////////////////////
exports.createEmployee = async (req,res)=>{

  try{

    const businessId = req.business.id;

    //////////////////////////////////////////////////////
    // CHECK EMAIL ALREADY EXISTS
    //////////////////////////////////////////////////////
    const existingUser = await prisma.user.findUnique({
      where:{ email:req.body.email }
    });

    if(existingUser){
      return res.status(400).json({
        success:false,
        message:"Email already used"
      });
    }

    //////////////////////////////////////////////////////
    // PASSWORD VALIDATION
    //////////////////////////////////////////////////////
    if(!req.body.password){
      return res.status(400).json({
        success:false,
        message:"Password is required"
      });
    }

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where:{ businessId }
    });

    //////////////////////////////////////////////////////
    // BUILD LEAVE BALANCE
    //////////////////////////////////////////////////////
    let leaveBalance = {};

    if(settings?.leaveTypes){
      settings.leaveTypes.forEach(leave=>{
        leaveBalance[leave.code] = leave.yearlyLimit;
      });
    }

    //////////////////////////////////////////////////////
    // HASH PASSWORD
    //////////////////////////////////////////////////////
    const hashedPassword = await bcrypt.hash(req.body.password,10);

    //////////////////////////////////////////////////////
    // GET OR CREATE EMPLOYEE ROLE
    //////////////////////////////////////////////////////
    let employeeRole = await prisma.role.findFirst({
      where:{
        businessId,
        name:"Employee"
      }
    });

    if(!employeeRole){
      employeeRole = await prisma.role.create({
        data:{
          name:"Employee",
          businessId
        }
      });
    }

    //////////////////////////////////////////////////////
    // TRANSACTION
    //////////////////////////////////////////////////////
    const result = await prisma.$transaction(async(tx)=>{

      /////////////////////////////////////////////////
      // CREATE USER (LOGIN ACCOUNT)
      /////////////////////////////////////////////////
      const user = await tx.user.create({
        data:{
          name:req.body.name,
          email:req.body.email,
          password:hashedPassword,
          role:"EMPLOYEE",
          activeBusinessId:businessId
        }
      });

      /////////////////////////////////////////////////
      // ADD USER TO BUSINESS
      /////////////////////////////////////////////////
      await tx.businessUser.create({
        data:{
          userId:user.id,
          businessId,
          roleId:employeeRole.id
        }
      });

      /////////////////////////////////////////////////
      // CREATE EMPLOYEE
      /////////////////////////////////////////////////
      const employee = await tx.employee.create({
        data:{
          businessId,
          userId:user.id,
          name:req.body.name,
          email:req.body.email,
          phone:req.body.phone,
          designation:req.body.designation,
          joinDate:req.body.joinDate ? new Date(req.body.joinDate) : null,
          basicSalary:Number(req.body.basicSalary),

          allowance:req.body.allowance || [],
          deduction:req.body.deduction || [],

          leaveBalance
        }
      });

      return employee;

    });

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success:true,
      message:"Employee created successfully",
      data:result
    });

  }catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET ALL EMPLOYEES
//////////////////////////////////////////////////////
exports.getAllEmployees = async (req,res)=>{

  const businessId = req.business.id;

  const employees = await prisma.employee.findMany({
    where:{businessId},
    include:{leaves:true}
  });

  res.json({
    success:true,
    data:employees
  });

};

//////////////////////////////////////////////////////
// GET SINGLE EMPLOYEE
//////////////////////////////////////////////////////
exports.getEmployee = async (req,res)=>{

  const employee = await prisma.employee.findUnique({
    where:{ id:req.params.id },
    include:{leaves:true}
  });

  res.json({
    success:true,
    data:employee
  });

};

//////////////////////////////////////////////////////
// UPDATE EMPLOYEE
//////////////////////////////////////////////////////
exports.updateEmployee = async (req,res)=>{

  const employee = await prisma.employee.update({
    where:{ id:req.params.id },
    data:req.body
  });

  res.json({
    success:true,
    data:employee
  });

};

//////////////////////////////////////////////////////
// DELETE EMPLOYEE
//////////////////////////////////////////////////////
exports.deleteEmployee = async (req,res)=>{

  const employee = await prisma.employee.findUnique({
    where:{ id:req.params.id }
  });

  if(!employee){
    return res.status(404).json({
      success:false,
      message:"Employee not found"
    });
  }

  await prisma.$transaction([
    prisma.employee.delete({
      where:{ id:req.params.id }
    }),
    prisma.user.delete({
      where:{ id:employee.userId }
    })
  ]);

  res.json({
    success:true,
    message:"Employee deleted"
  });

};