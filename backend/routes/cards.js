/* routes/cards.js */
const express = require("express");
const pool = require("../config/database");
const auth = require("../middleware/auth");
const router = express.Router();

// Créer une carte dans une liste
router.post("/lists/:listId/cards", auth, async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, description } = req.body;
    
    // Vérifier que la liste appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT l.id FROM lists l 
       JOIN boards b ON l.board_id = b.id 
       WHERE l.id = $1 AND b.user_id = $2`,
      [listId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Liste non trouvée" });
    }

    // Obtenir la prochaine position
    const positionResult = await pool.query(
      "SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM cards WHERE list_id = $1",
      [listId]
    );
    
    const nextPosition = positionResult.rows[0].next_position;

    // Créer la carte
    const result = await pool.query(
      `INSERT INTO cards (title, description, list_id, position) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title, description, listId, nextPosition]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la création de la carte:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour une carte
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, list_id } = req.body;
    
    // Vérifier que la carte appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT c.id FROM cards c 
       JOIN lists l ON c.list_id = l.id 
       JOIN boards b ON l.board_id = b.id 
       WHERE c.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    // Construire la requête de mise à jour dynamiquement
    let updateFields = [];
    let values = [];
    let valueIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${valueIndex++}`);
      values.push(title);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    
    if (list_id !== undefined) {
      updateFields.push(`list_id = $${valueIndex++}`);
      values.push(list_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    values.push(id);
    const query = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de la carte:", err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une carte
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que la carte appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT c.id FROM cards c 
       JOIN lists l ON c.list_id = l.id 
       JOIN boards b ON l.board_id = b.id 
       WHERE c.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Carte non trouvée" });
    }

    await pool.query("DELETE FROM cards WHERE id = $1", [id]);
    
    res.json({ message: "Carte supprimée" });
  } catch (err) {
    console.error("Erreur lors de la suppression de la carte:", err);
    res.status(500).json({ error: err.message });
  }
});

// Réorganiser les cartes d'une liste
router.post("/lists/:listId/cards/reorder", auth, async (req, res) => {
  try {
    const { listId } = req.params;
    const { ordered } = req.body; // Array d'IDs dans le nouvel ordre
    
    // Vérifier que la liste appartient à un board de l'utilisateur
    const checkResult = await pool.query(
      `SELECT l.id FROM lists l 
       JOIN boards b ON l.board_id = b.id 
       WHERE l.id = $1 AND b.user_id = $2`,
      [listId, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Liste non trouvée" });
    }

    // Mettre à jour les positions
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < ordered.length; i++) {
        await client.query(
          "UPDATE cards SET position = $1 WHERE id = $2 AND list_id = $3",
          [i + 1, ordered[i], listId]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: "Ordre des cartes mis à jour" });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erreur lors de la réorganisation des cartes:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;