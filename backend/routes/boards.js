const express = require("express");
const pool = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();

// Récupérer tous les boards d’un utilisateur
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM boards WHERE user_id = $1",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un board
router.post("/", auth, async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO boards (title, user_id) VALUES ($1, $2) RETURNING *",
      [title, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un board
router.delete("/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM boards WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "Board supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
