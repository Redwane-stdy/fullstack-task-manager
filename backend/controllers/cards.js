const pool = require("../config/database");

async function getCardsByList(listId) {
  const q = `SELECT * FROM cards WHERE list_id = $1 ORDER BY position ASC`;
  const res = await pool.query(q, [listId]);
  return res.rows;
}

async function createCard(listId, title, description = "", position = null) {
  if (position === null) {
    const { rows } = await pool.query("SELECT COALESCE(MAX(position),0)+1 AS pos FROM cards WHERE list_id = $1", [listId]);
    position = rows[0].pos;
  }
  const q = `INSERT INTO cards (list_id, title, description, position, created_at) VALUES ($1,$2,$3,$4,now()) RETURNING *`;
  const res = await pool.query(q, [listId, title, description, position]);
  return res.rows[0];
}

async function updateCard(cardId, fields = {}) {
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const k in fields) {
    sets.push(`${k} = $${idx++}`);
    vals.push(fields[k]);
  }
  if (sets.length === 0) return;
  vals.push(cardId);
  const q = `UPDATE cards SET ${sets.join(", ")}, updated_at = now() WHERE id = $${idx} RETURNING *`;
  const res = await pool.query(q, vals);
  return res.rows[0];
}

async function deleteCard(cardId) {
  await pool.query("DELETE FROM cards WHERE id = $1", [cardId]);
}

module.exports = { getCardsByList, createCard, updateCard, deleteCard };
