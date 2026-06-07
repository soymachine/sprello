import React from 'react';
import type { Card } from '../types';

interface Props {
  sprintId: string;
  listId: string;
  card: Card;
  onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void;
}

export default function CardItem({ sprintId, listId, card, onOpenCard }: Props) {
  const completedTasks = card.tasks.filter(t => t.completed).length;
  const totalTasks = card.tasks.length;
  const hasComments = card.comments.length > 0;
  const hasDescription = card.description.trim().length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/sprello-card', JSON.stringify({ sprintId, listId, cardId: card.id }));
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => { target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const isComplete = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onOpenCard({ sprintId, listId, cardId: card.id })}
      className={`group bg-[#080808] hover:bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#333] px-3 py-2.5 cursor-pointer transition-all ${
        isComplete ? 'border-l-2 border-l-primary/40' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {isComplete && (
          <span className="text-primary shrink-0 mt-0.5 text-xs font-mono">&#x2713;</span>
        )}
        <span className="text-xs font-medium text-surface-200 leading-snug break-words flex-1 font-mono">
          {card.name}
        </span>
      </div>

      {(hasDescription || totalTasks > 0 || hasComments) && (
        <div className="flex items-center gap-3 mt-2">
          {hasDescription && (
            <span className="text-[#444] text-[10px] flex items-center gap-1 font-mono" title="Descripción">
              &#x2630;
            </span>
          )}
          {totalTasks > 0 && (
            <span className={`text-[10px] flex items-center gap-1 font-mono ${isComplete ? 'text-primary' : 'text-[#444]'}`} title="Checklist">
              &#x2611;{completedTasks}/{totalTasks}
            </span>
          )}
          {hasComments && (
            <span className="text-[#444] text-[10px] flex items-center gap-1 font-mono" title={`${card.comments.length} comentarios`}>
              &#x25CF;{card.comments.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
