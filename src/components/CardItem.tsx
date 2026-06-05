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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onOpenCard({ sprintId, listId, cardId: card.id })}
      className="group bg-surface-700/60 hover:bg-surface-700 rounded-lg px-3 py-2.5 cursor-pointer transition-all border border-transparent hover:border-surface-600 shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        {card.tasks.length > 0 && completedTasks === totalTasks && (
          <span className="text-green-400 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        )}
        <span className="text-sm font-medium text-surface-100 leading-snug break-words flex-1">
          {card.name}
        </span>
      </div>

      {(hasDescription || totalTasks > 0 || hasComments) && (
        <div className="flex items-center gap-3 mt-2">
          {hasDescription && (
            <span className="text-surface-500 text-xs flex items-center gap-1" title="Tiene descripción">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </span>
          )}
          {totalTasks > 0 && (
            <span className={`text-xs flex items-center gap-1 ${completedTasks === totalTasks ? 'text-green-400' : 'text-surface-500'}`} title="Checklist">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {completedTasks}/{totalTasks}
            </span>
          )}
          {hasComments && (
            <span className="text-surface-500 text-xs flex items-center gap-1" title={`${card.comments.length} comentarios`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {card.comments.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
