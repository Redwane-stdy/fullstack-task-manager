/* routes/lists.js - FIXED VERSION */
const express = require("express");
const pool = require("../config/database");
const auth = require("../middleware/auth");
const router = express.Router();

// Mettre à jour une liste (sans description)
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body; // Removed description since column doesn't exist
    
    // Vérifier que la liste appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT l.id FROM lists l
       JOIN boards b ON l.board_id = b.id
       WHERE l.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Liste non trouvée" });
    }

    // Update only title (no description column)
    const result = await pool.query(
      "UPDATE lists SET title = $1 WHERE id = $2 RETURNING *",
      [title, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de la liste:", err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une liste
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que la liste appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT l.id FROM lists l
       JOIN boards b ON l.board_id = b.id
       WHERE l.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Liste non trouvée" });
    }

    // Supprimer la liste (les cartes seront supprimées en cascade si configuré)
    await pool.query("DELETE FROM lists WHERE id = $1", [id]);
    
    res.json({ message: "Liste supprimée" });
  } catch (err) {
    console.error("Erreur lors de la suppression de la liste:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;