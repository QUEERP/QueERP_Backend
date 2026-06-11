const prisma = require("../config/prisma");

exports.getNotes = async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const note = await prisma.note.create({
      data: {
        id: crypto.randomUUID(),
        ...req.body,
        businessId: req.business.id,
      },
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const updated = await prisma.note.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body,
    });
    if (updated.count === 0)
      return res.status(404).json({ success: false, message: "Note not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const deleted = await prisma.note.deleteMany({
      where: { id: req.params.id, businessId: req.business.id },
    });
    if (deleted.count === 0)
      return res.status(404).json({ success: false, message: "Note not found" });
    res.json({ success: true, message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
