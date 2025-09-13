const pool = require("../config/database");

async function getListsByBoard(boardId, userId) {
  const q = `SELECT * FROM lists WHERE board_id = $1 ORDER BY position ASC`;
  const res = await pool.query(q, [boardId]);
  return res.rows;
}

async function createList(boardId, title, position = null) {
  if (position === null) {
    const { rows } = await pool.query("SELECT COALESCE(MAX(position),0)+1 AS pos FROM lists WHERE board_id = $1", [boardId]);
    position = rows[0].pos;
  }
  const q = `INSERT INTO lists (board_id, title, position, created_at) VALUES ($1,$2,$3,now()) RETURNING *`;
  const res = await pool.query(q, [boardId, title, position]);
  return res.rows[0];
}

async function updateListPosition(listId, position) {
  await pool.query("UPDATE lists SET position = $1, updated_at = now() WHERE id = $2", [position, listId]);
}

async function deleteList(listId) {
  await pool.query("DELETE FROM lists WHERE id = $1", [listId]);
}

module.exports = { getListsByBoard, createList, updateListPosition, deleteList };
