const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/journalController");

//////////////////////////////////////////////////////
// CREATE JOURNAL ENTRY
//////////////////////////////////////////////////////
router.post(
  "/",
  auth,
  business,
  checkPermission("journal", "create"),
  Controller.createJournalEntry
);

//////////////////////////////////////////////////////
// GET ALL ENTRIES
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  checkPermission("journal", "read"),
  Controller.getJournalEntries
);

//////////////////////////////////////////////////////
// GET SINGLE ENTRY
//////////////////////////////////////////////////////
router.get(
  "/:id",
  auth,
  business,
  checkPermission("journal", "read"),
  Controller.getJournalEntry
);

//////////////////////////////////////////////////////
// DELETE ENTRY
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  auth,
  business,
  checkPermission("journal", "delete"),
  Controller.deleteJournalEntry
);

module.exports = router;