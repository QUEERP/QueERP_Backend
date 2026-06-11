const router = require("express").Router();

const bankChangeController = require("../controllers/bankChangeController");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");

//////////////////////////////////////////////////////
// CREATE BANK CHANGE REQUEST (EMPLOYEE)
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  bankChangeController.createBankChangeRequest
);

//////////////////////////////////////////////////////
// GET MY BANK CHANGE REQUESTS (EMPLOYEE)
//////////////////////////////////////////////////////
router.get(
  "/my-requests",
  authMiddleware,
  businessMiddleware,
  bankChangeController.getMyBankChangeRequests
);

//////////////////////////////////////////////////////
// GET ALL BANK CHANGE REQUESTS (ADMIN)
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  bankChangeController.getBankChangeRequests
);

//////////////////////////////////////////////////////
// APPROVE / REJECT REQUEST (ADMIN)
//////////////////////////////////////////////////////
router.patch(
  "/:id",
  authMiddleware,
  businessMiddleware,
  bankChangeController.updateBankRequestStatus
);

module.exports = router;