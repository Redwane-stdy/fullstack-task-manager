// src/components/List.jsx
import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from './Card';

export default function List({ list, onAddCardClick, onDeleteList, onCardDelete, onCardClick }) {
  // id doit être `list-${list.id}`
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `list-${list.id}` });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-50 rounded-xl p-4 min-w-[300px] max-w-[320px] shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-800">{list.title}</h3>
          {list.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{list.description}</p>}
        </div>
        <div>
          <button onClick={() => onDeleteList(list.id)} className="text-red-500 text-sm">🗑</button>
        </div>
      </div>

      <div className="mt-4 space-y-3 min-h-[20px]">
        <SortableContext
          items={(list.cards || []).map(c => `card-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {(list.cards || []).map(card => (
            <Card
              key={card.id}
              card={card}
              onDelete={(cardId) => onCardDelete(cardId, list.id)}
              onClick={(c) => onCardClick?.(c, list.id)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="mt-4">
        <button
          onClick={() => onAddCardClick(list.id)}
          className="w-full text-sm bg-gray-200 hover:bg-gray-300 py-2 rounded"
        >
          ➕ Ajouter une carte
        </button>
      </div>
    </div>
  );
}
