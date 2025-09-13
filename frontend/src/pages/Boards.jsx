/* pages/Boards.jsx */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const Boards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  // Charger les tableaux
  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/boards');
      setBoards(response.data || []);
      console.log('✅ Tableaux chargés:', response.data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des tableaux:', error);
      setError('Impossible de charger les tableaux');
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!newBoard.title.trim()) return;

    try {
      setCreating(true);
      const response = await api.post('/boards', newBoard);
      setBoards(prev => [...prev, response.data]);
      setNewBoard({ title: '', description: '' });
      setShowCreateModal(false);
      console.log('✅ Tableau créé:', response.data);
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
      alert('Erreur lors de la création du tableau');
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (boardId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tableau ?')) return;

    try {
      await api.delete(`/boards/${boardId}`);
      setBoards(prev => prev.filter(board => board.id !== boardId));
      console.log('✅ Tableau supprimé');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Mes Tableaux
          </h1>
          <p className="text-gray-600 mt-1">
            Bienvenue, {user?.username || user?.email} ! Gérez vos projets ici.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Nouveau tableau</span>
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Liste des tableaux */}
      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Aucun tableau pour le moment
          </h3>
          <p className="text-gray-500 mb-6">
            Créez votre premier tableau pour commencer à organiser vos tâches
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            ➕ Créer un tableau
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map(board => (
            <div
              key={board.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div
                onClick={() => navigate(`/boards/${board.id}`)}
                className="p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {board.title}
                </h3>
                {board.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {board.description}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>
                    Créé le {new Date(board.created_at).toLocaleDateString()}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {board.lists_count || 0} listes
                  </span>
                </div>
              </div>
              
              <div className="border-t bg-gray-50 px-6 py-3 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBoard(board.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Créer un nouveau tableau
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({...newBoard, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mon nouveau projet"
                  maxLength="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({...newBoard, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description du projet (optionnel)"
                  rows="3"
                  maxLength="500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                disabled={creating}
              >
                Annuler
              </button>
              <button
                onClick={createBoard}
                disabled={!newBoard.title.trim() || creating}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  !newBoard.title.trim() || creating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Boards;