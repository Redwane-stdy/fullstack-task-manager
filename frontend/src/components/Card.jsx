// src/components/Card.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Card({ card, onDelete, onClick }) {
  // id doit être `card-${card.id}`
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `card-${card.id}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition"
      onDoubleClick={() => onClick?.(card)}
    >
      <div className="flex justify-between">
        <div className="pr-2">
          <h4 className="font-medium text-gray-900 text-sm truncate">{card.title}</h4>
          {card.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-3">{card.description}</p>
          )}
        </div>
        <div className="ml-2 flex flex-col items-end">
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(card.id); }} className="text-red-500 text-sm">❌</button>
        </div>
      </div>
    </div>
  );
}
