const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE BANK CHANGE REQUEST
//////////////////////////////////////////////////////

exports.createBankChangeRequest = async (req,res)=>{
  try{

    const employeeId = req.user.employeeId;
    const businessId = req.business.id;

    const { bankName, accountNumber, Code, accountHolderName, country } = req.body;

    const request = await prisma.bankChangeRequest.create({
      data:{
        employeeId,
        businessId,
        bankName,
        accountNumber,
        Code,
        accountHolderName,
        country
      }
    });

    res.json({
      success:true,
      message:"Bank change request created",
      data:request
    });

  }catch(error){
    console.log(error);
    res.status(500).json({
      success:false
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL BANK REQUESTS (ADMIN)
//////////////////////////////////////////////////////

exports.getBankChangeRequests = async (req,res)=>{
  try{

    const businessId = req.business.id;

    const requests = await prisma.bankChangeRequest.findMany({
      where:{ businessId },
      include:{
        employee:true
      },
      orderBy:{
        createdAt:"desc"
      }
    });

    res.json({
      success:true,
      data:requests
    });

  }catch(error){
    console.log(error);
    res.status(500).json({
      success:false
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE REQUEST STATUS (ADMIN)
//////////////////////////////////////////////////////
exports.updateBankRequestStatus = async (req,res)=>{
  try{

    const { id } = req.params;
    const { status } = req.body;

    const request = await prisma.bankChangeRequest.findUnique({
      where:{ id }
    });

    if(!request){
      return res.status(404).json({
        success:false,
        message:"Request not found"
      });
    }

    //////////////////////////////////////
    // IF APPROVED UPDATE EMPLOYEE
    //////////////////////////////////////

    if(status === "APPROVED"){

      await prisma.employee.update({
        where:{
          id:request.employeeId
        },
        data:{
          bankName:request.bankName,
          accountNumber:request.accountNumber,
          Code:request.Code,
          accountHolderName:request.accountHolderName
        }
      });

    }

    //////////////////////////////////////
    // UPDATE REQUEST STATUS
    //////////////////////////////////////

    const updatedRequest = await prisma.bankChangeRequest.update({
      where:{ id },
      data:{ status }
    });

    res.json({
      success:true,
      message:`Request ${status}`,
      data:updatedRequest
    });

  }catch(error){
    console.log(error);
    res.status(500).json({
      success:false
    });
  }
};

exports.getMyBankChangeRequests = async (req,res)=>{
  try{

    const businessId = req.business.id;
    const userId = req.user.id;

    const employee = await prisma.employee.findFirst({
      where:{
        userId,
        businessId
      }
    });

    if(!employee){
      return res.status(404).json({
        success:false,
        message:"Employee not found"
      });
    }

    const requests = await prisma.bankChangeRequest.findMany({
      where:{
        employeeId:employee.id
      },
      orderBy:{
        createdAt:"desc"
      }
    });

    res.json({
      success:true,
      data:requests
    });

  }catch(error){
    console.log(error);
    res.status(500).json({
      success:false
    });
  }
};