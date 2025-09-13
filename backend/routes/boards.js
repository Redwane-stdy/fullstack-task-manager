/* routes/boards.js */
const express = require("express");
const pool = require("../config/database");
const auth = require("../middleware/auth");
const router = express.Router();

// Récupérer tous les boards d'un utilisateur
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un board
router.post("/", auth, async (req, res) => {
  const { title, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO boards (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer un board spécifique par id
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM boards WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Board non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// *** FIXED ROUTE : Récupérer toutes les listes d'un board avec leurs cartes ***
router.get("/:boardId/lists", auth, async (req, res) => {
  try {
    const { boardId } = req.params;
    
    // Vérifier que le board appartient à l'utilisateur
    const boardCheck = await pool.query(
      "SELECT id FROM boards WHERE id = $1 AND user_id = $2",
      [boardId, req.user.id]
    );
    
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: "Board non trouvé" });
    }

    // Récupérer les listes avec leurs cartes (sans description pour les listes)
    const listsResult = await pool.query(
      `SELECT 
         l.id, 
         l.title, 
         l.position, 
         l.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', c.id,
               'title', c.title,
               'description', c.description,
               'position', c.position,
               'created_at', c.created_at
             ) ORDER BY c.position ASC, c.created_at ASC
           ) FILTER (WHERE c.id IS NOT NULL), 
           '[]'
         ) as cards
       FROM lists l
       LEFT JOIN cards c ON l.id = c.list_id
       WHERE l.board_id = $1
       GROUP BY l.id, l.title, l.position, l.created_at
       ORDER BY l.position ASC, l.created_at ASC`,
      [boardId]
    );

    res.json(listsResult.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des listes:", err);
    res.status(500).json({ error: err.message });
  }
});

// *** FIXED ROUTE : Créer une liste dans un board ***
router.post("/:boardId/lists", auth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title } = req.body; // Removed description since column doesn't exist
    
    // Vérifier que le board appartient à l'utilisateur
    const boardCheck = await pool.query(
      "SELECT id FROM boards WHERE id = $1 AND user_id = $2",
      [boardId, req.user.id]
    );
    
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: "Board non trouvé" });
    }

    // Obtenir la prochaine position
    const positionResult = await pool.query(
      "SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM lists WHERE board_id = $1",
      [boardId]
    );
    
    const nextPosition = positionResult.rows[0].next_position;

    // Créer la liste (sans description)
    const result = await pool.query(
      `INSERT INTO lists (title, board_id, position) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [title, boardId, nextPosition]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur lors de la création de la liste:", err);
    res.status(500).json({ error: err.message });
  }
});

// *** NOUVELLE ROUTE : Réorganiser les listes d'un board ***
router.post("/:boardId/lists/reorder", auth, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { ordered } = req.body; // Array d'IDs dans le nouvel ordre
    
    // Vérifier que le board appartient à l'utilisateur
    const boardCheck = await pool.query(
      "SELECT id FROM boards WHERE id = $1 AND user_id = $2",
      [boardId, req.user.id]
    );
    
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: "Board non trouvé" });
    }

    // Mettre à jour les positions
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < ordered.length; i++) {
        await client.query(
          "UPDATE lists SET position = $1 WHERE id = $2 AND board_id = $3",
          [i + 1, ordered[i], boardId]
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: "Ordre des listes mis à jour" });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erreur lors de la réorganisation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un board
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Board non trouvé" });
    }
    
    res.json({ message: "Board supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;