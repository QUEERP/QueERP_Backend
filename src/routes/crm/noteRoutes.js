const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const businessMiddleware = require("../../middlewares/business.middleware");
const checkPermission = require("../../middlewares/checkPermission");

const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require("../../controllers/crm/noteController");

router.use(authMiddleware);
router.use(businessMiddleware);

// CREATE NOTE
router.post(
  "/",
  checkPermission("note", "create"),
  createNote
);

// GET ALL NOTES
router.get(
  "/",
  checkPermission("note", "view"),
  getNotes
);

// UPDATE NOTE
router.put(
  "/:id",
  checkPermission("note", "update"),
  updateNote
);

// DELETE NOTE
router.delete(
  "/:id",
  checkPermission("note", "delete"),
  deleteNote
);

module.exports = router;
