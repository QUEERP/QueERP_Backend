const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const {
  createContact,
  getContacts,
  updateContact,
  deleteContact
} = require("../controllers/customerContactController");

//////////////////////////////////////////////////////
// CREATE CONTACT
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkPermission("customer_contact", "create"),
  createContact
);

//////////////////////////////////////////////////////
// GET ALL CONTACTS (BY CUSTOMER)
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  getContacts
);



//////////////////////////////////////////////////////
// UPDATE CONTACT
//////////////////////////////////////////////////////
router.put(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkPermission("customer_contact", "update"),
  updateContact
);

//////////////////////////////////////////////////////
// DELETE CONTACT
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkPermission("customer_contact", "delete"),
  deleteContact
);

module.exports = router;