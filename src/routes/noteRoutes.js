const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");

router.get("/", auth, business, noteController.getNotes);
router.post("/", auth, business, noteController.createNote);
router.put("/:id", auth, business, noteController.updateNote);
router.delete("/:id", auth, business, noteController.deleteNote);

module.exports = router;
