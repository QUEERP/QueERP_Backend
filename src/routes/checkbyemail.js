const express = require("express");
const router = express.Router();

const checkUserController = require(
  "../controllers/checkByEmail"
);

//////////////////////////////////////////////////////
// CHECK USER EMAIL
//////////////////////////////////////////////////////

router.post(
  "/",
  checkUserController.checkUserByEmail
);

module.exports = router;