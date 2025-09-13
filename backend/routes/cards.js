const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const cardsCtrl = require("../controllers/cards");

// GET cards by list
router.get("/list/:listId", auth, async (req,res)=>{
  try {
    const cards = await cardsCtrl.getCardsByList(req.params.listId);
    res.json(cards);
  } catch (err){ res.status(500).json({ error: err.message }); }
});

// POST create card
router.post("/:listId", auth, async (req,res)=>{
  const { title, description, position } = req.body;
  try {
    const card = await cardsCtrl.createCard(req.params.listId, title, description, position);
    res.json(card);
  } catch (err){ res.status(500).json({ error: err.message }); }
});

// PATCH update card (move between lists or edit)
router.patch("/:id", auth, async (req,res)=>{
  try {
    const card = await cardsCtrl.updateCard(req.params.id, req.body);
    res.json(card);
  } catch (err){ res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete("/:id", auth, async (req,res)=>{
  try {
    await cardsCtrl.deleteCard(req.params.id);
    res.json({ message: "card deleted" });
  } catch (err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
