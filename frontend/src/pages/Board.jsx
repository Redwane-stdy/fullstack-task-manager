// src/pages/Board.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import List from '../components/List';
import {
  listsAPI,
  cardsAPI,
  boardsAPI
} from '../api';

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewList, setShowNewList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const [addingCardList, setAddingCardList] = useState(null);
  const [newCard, setNewCard] = useState({});

  // dnd overlay
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => { loadBoard(); }, [id]);

  async function loadBoard() {
    try {
      setLoading(true);
      // get board meta if available
      try {
        const resBoard = await boardsAPI.get(id);
        setBoard(resBoard.data);
      } catch (e) {
        // ignore if no /boards/:id endpoint
      }

      const res = await listsAPI.listForBoard(id);
      // expected: [{ id, title, description, position, cards: [{id,title,description,position,created_at}] }]
      setLists(res.data || []);
    } catch (err) {
      console.error('Erreur chargement board:', err);
      alert('Impossible de charger le tableau');
    } finally {
      setLoading(false);
    }
  }

  // Create list
  const onAddList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const res = await listsAPI.createForBoard(id, { title: newListTitle });
      setLists(prev => [...prev, { ...res.data, cards: [] }]);
      setNewListTitle('');
      setShowNewList(false);
    } catch (err) {
      console.error(err);
      alert('Erreur création liste');
    }
  };

  const onDeleteList = async (listId) => {
    if (!confirm('Supprimer cette liste et ses cartes ?')) return;
    try {
      await listsAPI.remove(listId);
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) {
      console.error(err);
      alert('Erreur suppression liste');
    }
  };

  // Cards
  const onAddCardClick = (listId) => {
    setAddingCardList(listId);
    setNewCard(prev => ({ ...prev, [listId]: { title: '', description: '' } }));
  };

  const onCreateCard = async (listId) => {
    const payload = newCard[listId];
    if (!payload?.title?.trim()) return;
    try {
      const res = await cardsAPI.createForList(listId, payload);
      setLists(prev => prev.map(l => l.id === listId ? { ...l, cards: [...(l.cards||[]), res.data] } : l));
      setAddingCardList(null);
    } catch (err) {
      console.error(err);
      alert('Erreur création carte');
    }
  };

  const onDeleteCard = async (cardId, listId) => {
    if (!confirm('Supprimer cette carte ?')) return;
    try {
      await cardsAPI.remove(cardId);
      setLists(prev => prev.map(l => l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l));
    } catch (err) {
      console.error(err);
      alert('Erreur suppression carte');
    }
  };

  // UTIL: trouver position d'une carte
  function findCardPosition(cardId) {
    for (let i = 0; i < lists.length; i++) {
      const idx = (lists[i].cards || []).findIndex(c => String(c.id) === String(cardId));
      if (idx !== -1) return { listIndex: i, cardIndex: idx };
    }
    return null;
  }

  // DnD handlers
  function handleDragStart(event) {
    const { active } = event;
    setActiveId(active.id);
    // determine active item data
    if (String(active.id).startsWith('list-')) {
      const idOnly = String(active.id).replace('list-', '');
      const list = lists.find(l => String(l.id) === String(idOnly));
      setActiveItem({ type: 'list', data: list });
    } else if (String(active.id).startsWith('card-')) {
      const cId = String(active.id).replace('card-', '');
      const pos = findCardPosition(cId);
      if (pos) {
        setActiveItem({ type: 'card', data: lists[pos.listIndex].cards[pos.cardIndex] });
      } else {
        setActiveItem(null);
      }
    } else {
      setActiveItem(null);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Reorder lists
    if (activeId.startsWith('list-')) {
      const srcIndex = lists.findIndex(l => `list-${l.id}` === activeId);
      let destIndex = lists.findIndex(l => `list-${l.id}` === overId);
      if (destIndex === -1) {
        // if dropped on a card, find parent list of that card
        for (let i = 0; i < lists.length; i++) {
          if ((lists[i].cards || []).some(c => `card-${c.id}` === overId)) { destIndex = i; break; }
        }
      }
      if (srcIndex === -1 || destIndex === -1) return;
      if (srcIndex === destIndex) return;
      const newLists = arrayMove([...lists], srcIndex, destIndex);
      setLists(newLists);
      try {
        await listsAPI.reorderForBoard(id, newLists.map(l => l.id));
      } catch (err) { console.error('Erreur reorder lists:', err); }
      return;
    }

    // Card drag (same list or different)
    if (activeId.startsWith('card-')) {
      const cardId = activeId.replace('card-','');
      // source position
      const srcPos = findCardPosition(cardId);
      if (!srcPos) return;
      // destination: could be card-<id> (insert before/after) or cards-<listId> (append)
      let destListId = null;
      let destIndex = -1;

      if (overId.startsWith('card-')) {
        const overCardId = overId.replace('card-','');
        // find its position
        const destPos = findCardPosition(overCardId);
        if (!destPos) return;
        destListId = lists[destPos.listIndex].id;
        destIndex = destPos.cardIndex;
        // if moving down within same list and srcIndex < destIndex, insert after -> adjust
        if (srcPos.listIndex === destPos.listIndex && srcPos.cardIndex < destIndex) {
          destIndex = destIndex + 1;
        }
      } else if (overId.startsWith('cards-')) {
        destListId = overId.replace('cards-','');
        // append at end
        const destList = lists.find(l => String(l.id) === String(destListId));
        destIndex = destList ? (destList.cards || []).length : 0;
      } else {
        // unknown drop target
        return;
      }

      // If no movement, skip
      const srcListId = lists[srcPos.listIndex].id;
      if (String(srcListId) === String(destListId) && srcPos.cardIndex === destIndex) return;

      // Remove from source and insert into dest
      const newLists = lists.map(l => ({ ...l, cards: [...(l.cards || [])] }));
      // find source list in newLists
      const sIdx = newLists.findIndex(l => String(l.id) === String(srcListId));
      const dIdx = newLists.findIndex(l => String(l.id) === String(destListId));
      if (sIdx === -1 || dIdx === -1) return;

      const [moved] = newLists[sIdx].cards.splice(srcPos.cardIndex, 1);
      newLists[dIdx].cards.splice(destIndex, 0, moved);

      setLists(newLists);

      // Call backend to persist order and possibly list change
      try {
        // Update order of source list
        await cardsAPI.reorderForList(srcListId, newLists[sIdx].cards.map(c => c.id));
      } catch (err) { console.error('Erreur reorder source list:', err); }

      try {
        if (srcListId !== destListId) {
          // If backend requires updating card.list_id, call update
          await cardsAPI.update(moved.id, { list_id: destListId });
        }
      } catch (err) { console.error('Erreur update card list_id:', err); }

      try {
        // Update order of dest list
        await cardsAPI.reorderForList(destListId, newLists[dIdx].cards.map(c => c.id));
      } catch (err) { console.error('Erreur reorder dest list:', err); }

      return;
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveItem(null);
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/boards')} className="text-gray-600 hover:text-gray-800">← Retour</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board?.title || 'Tableau'}</h1>
            {board?.description && <p className="text-gray-600 text-sm mt-1">{board.description}</p>}
          </div>
        </div>

        <button onClick={() => setShowNewList(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
          <span>➕</span><span>Nouvelle liste</span>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={(lists || []).map(l => `list-${l.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="grid grid-flow-col auto-cols-[320px] gap-6 overflow-x-auto pb-6">
            {lists.map(list => (
              <div key={list.id} className="min-w-[300px]">
                {/* For cards droppable area we expose id={`cards-${list.id}`} via empty droppable */}
                <div data-droppable-id={`cards-${list.id}`}>
                  <List
                    list={list}
                    onAddCardClick={onAddCardClick}
                    onDeleteList={onDeleteList}
                    onCardDelete={onDeleteCard}
                    onCardClick={() => {}}
                  />
                </div>
              </div>
            ))}

            {/* Add list column */}
            <div className="min-w-[300px]">
              {showNewList ? (
                <div className="bg-gray-100 rounded-xl p-4">
                  <input value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} className="w-full px-3 py-2 border rounded mb-3" placeholder="Nom de la liste" />
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => setShowNewList(false)} className="px-3 py-1">Annuler</button>
                    <button onClick={onAddList} className="bg-blue-600 text-white px-3 py-1 rounded">Créer</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewList(true)} className="w-full bg-gray-200 hover:bg-gray-300 py-4 rounded">➕ Ajouter une liste</button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            activeItem.type === 'list' ? (
              <div className="bg-white rounded-xl p-4 shadow-md min-w-[250px]">
                <h4 className="font-semibold">{activeItem.data?.title}</h4>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <h4 className="font-medium">{activeItem.data?.title}</h4>
                {activeItem.data?.description && <p className="text-xs text-gray-600 mt-1">{activeItem.data.description}</p>}
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card composer modal (inline) */}
      {addingCardList && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] bg-white rounded shadow-lg p-4">
          <h4 className="font-semibold mb-2">Nouvelle carte</h4>
          <input className="w-full px-3 py-2 border rounded mb-2" placeholder="Titre" value={newCard[addingCardList]?.title || ''} onChange={(e) => setNewCard(prev => ({ ...prev, [addingCardList]: { ...prev[addingCardList], title: e.target.value } }))} />
          <textarea className="w-full px-3 py-2 border rounded mb-3" rows={3} placeholder="Description" value={newCard[addingCardList]?.description || ''} onChange={(e) => setNewCard(prev => ({ ...prev, [addingCardList]: { ...prev[addingCardList], description: e.target.value } }))} />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setAddingCardList(null)} className="px-3 py-1">Annuler</button>
            <button onClick={() => onCreateCard(addingCardList)} className="bg-blue-600 text-white px-3 py-1 rounded">Ajouter</button>
          </div>
        </div>
      )}
    </div>
  );
}
