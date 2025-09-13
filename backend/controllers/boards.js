const pool = require("../config/database");

// get all boards for user (with counts)
async function getBoards(userId) {
  const q = `
    SELECT b.*,
           COALESCE(l.list_count,0) AS lists_count,
           COALESCE(c.card_count,0) AS cards_count
    FROM boards b
    LEFT JOIN (
      SELECT board_id, COUNT(*) AS list_count FROM lists GROUP BY board_id
    ) l ON l.board_id = b.id
    LEFT JOIN (
      SELECT li.board_id, COUNT(*) AS card_count
      FROM cards c JOIN lists li ON c.list_id = li.id
      GROUP BY li.board_id
    ) c ON c.board_id = b.id
    WHERE b.user_id = $1
    ORDER BY b.updated_at DESC;
  `;
  const res = await pool.query(q, [userId]);
  return res.rows;
}

async function createBoard(userId, title) {
  const q = `
    INSERT INTO boards (title, user_id, created_at, updated_at)
    VALUES ($1, $2, now(), now())
    RETURNING *;
  `;
  const res = await pool.query(q, [title, userId]);
  return res.rows[0];
}

async function deleteBoard(userId, boardId) {
  await pool.query("DELETE FROM boards WHERE id = $1 AND user_id = $2", [boardId, userId]);
}

module.exports = { getBoards, createBoard, deleteBoard };
