const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const listsCtrl = require("../controllers/lists");

// GET lists by board
router.get("/board/:boardId", auth, async (req, res) => {
  try {
    const lists = await listsCtrl.getListsByBoard(req.params.boardId, req.user.id);
    res.json(lists);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create list
router.post("/:boardId", auth, async (req, res) => {
  const { title, position } = req.body;
  try {
    const list = await listsCtrl.createList(req.params.boardId, title, position);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update position (drag & drop)
router.patch("/position/:id", auth, async (req,res) => {
  try {
    await listsCtrl.updateListPosition(req.params.id, req.body.position);
    res.json({ message: "position updated" });
  } catch (err){ res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete("/:id", auth, async (req,res) => {
  try {
    await listsCtrl.deleteList(req.params.id);
    res.json({ message: "list deleted" });
  } catch (err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
