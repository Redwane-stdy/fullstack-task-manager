/* pages/Board.jsx */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const Board = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [showNewCard, setShowNewCard] = useState({});
  const [newCardData, setNewCardData] = useState({});

  useEffect(() => {
    loadBoard();
  }, [id]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      
      // Charger les infos du tableau
      const boardResponse = await api.get(`/boards/${id}`);
      setBoard(boardResponse.data);
      
      // Charger les listes avec leurs cartes
      const listsResponse = await api.get(`/boards/${id}/lists`);
      setLists(listsResponse.data || []);
      
      console.log('✅ Tableau chargé:', boardResponse.data);
      console.log('✅ Listes chargées:', listsResponse.data);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      if (error.response?.status === 404) {
        setError('Tableau non trouvé');
      } else {
        setError('Impossible de charger le tableau');
      }
    } finally {
      setLoading(false);
    }
  };

  const createList = async () => {
    if (!newListTitle.trim()) return;

    try {
      const response = await api.post(`/boards/${id}/lists`, {
        title: newListTitle,
        position: lists.length
      });
      
      setLists(prev => [...prev, { ...response.data, cards: [] }]);
      setNewListTitle('');
      setShowNewList(false);
      console.log('✅ Liste créée:', response.data);
    } catch (error) {
      console.error('❌ Erreur lors de la création de la liste:', error);
      alert('Erreur lors de la création de la liste');
    }
  };

  const deleteList = async (listId) => {
    if (!confirm('Supprimer cette liste et toutes ses cartes ?')) return;

    try {
      await api.delete(`/lists/${listId}`);
      setLists(prev => prev.filter(list => list.id !== listId));
      console.log('✅ Liste supprimée');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const createCard = async (listId) => {
    const cardData = newCardData[listId];
    if (!cardData?.title?.trim()) return;

    try {
      const response = await api.post(`/lists/${listId}/cards`, {
        title: cardData.title,
        description: cardData.description || '',
        position: lists.find(l => l.id === listId)?.cards?.length || 0
      });

      setLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, cards: [...(list.cards || []), response.data] }
          : list
      ));

      setNewCardData(prev => ({ ...prev, [listId]: { title: '', description: '' } }));
      setShowNewCard(prev => ({ ...prev, [listId]: false }));
      console.log('✅ Carte créée:', response.data);
    } catch (error) {
      console.error('❌ Erreur lors de la création de la carte:', error);
      alert('Erreur lors de la création de la carte');
    }
  };

  const deleteCard = async (cardId, listId) => {
    if (!confirm('Supprimer cette carte ?')) return;

    try {
      await api.delete(`/cards/${cardId}`);
      setLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, cards: list.cards.filter(card => card.id !== cardId) }
          : list
      ));
      console.log('✅ Carte supprimée');
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

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">❌ {error}</h2>
        <button
          onClick={() => navigate('/boards')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          ← Retour aux tableaux
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header du tableau */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/boards')}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {board?.title}
            </h1>
            {board?.description && (
              <p className="text-gray-600 text-sm mt-1">
                {board.description}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowNewList(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Nouvelle liste</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-6 overflow-x-auto pb-6">
        {lists.map(list => (
          <div key={list.id} className="bg-gray-100 rounded-lg p-4 min-w-80 flex-shrink-0">
            {/* Header de la liste */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">
                {list.title} ({list.cards?.length || 0})
              </h3>
              <button
                onClick={() => deleteList(list.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                🗑️
              </button>
            </div>

            {/* Cartes */}
            <div className="space-y-3 mb-4">
              {list.cards?.map(card => (
                <div key={card.id} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {card.title}
                      </h4>
                      {card.description && (
                        <p className="text-sm text-gray-600">
                          {card.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Créée le {new Date(card.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCard(card.id, list.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajouter une carte */}
            {showNewCard[list.id] ? (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <input
                  type="text"
                  placeholder="Titre de la carte"
                  value={newCardData[list.id]?.title || ''}
                  onChange={(e) => setNewCardData(prev => ({
                    ...prev,
                    [list.id]: { ...prev[list.id], title: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm"
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={newCardData[list.id]?.description || ''}
                  onChange={(e) => setNewCardData(prev => ({
                    ...prev,
                    [list.id]: { ...prev[list.id], description: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-3 text-sm"
                  rows="2"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => createCard(list.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => setShowNewCard(prev => ({ ...prev, [list.id]: false }))}
                    className="text-gray-600 hover:text-gray-800 px-3 py-1 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCard(prev => ({ ...prev, [list.id]: true }))}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ➕ Ajouter une carte
              </button>
            )}
          </div>
        ))}

        {/* Nouvelle liste */}
        {showNewList ? (
          <div className="bg-gray-100 rounded-lg p-4 min-w-80">
            <input
              type="text"
              placeholder="Nom de la liste"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={createList}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Créer
              </button>
              <button
                onClick={() => setShowNewList(false)}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewList(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg p-4 min-w-80 font-medium transition-colors"
          >
            ➕ Ajouter une liste
          </button>
        )}
      </div>

      {/* Message si pas de listes */}
      {lists.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Tableau vide
          </h3>
          <p className="text-gray-500 mb-6">
            Créez votre première liste pour commencer à organiser vos tâches
          </p>
        </div>
      )}
    </div>
  );
};

export default Board;