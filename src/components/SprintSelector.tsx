import React, { useState } from 'react';
import { useKanban } from '../store/KanbanContext';
import { useTheme } from '../store/themeStore';
import SprintModal from './SprintModal';

export default function SprintSelector({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const { state, dispatch } = useKanban();
  const { sprints, activeSprintId } = state;
  const { theme, toggle } = useTheme();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<typeof sprints[0] | null>(null);

  const deleteSprint = (id: string) => {
    if (sprints.length <= 1) return;
    dispatch({ type: 'DELETE_SPRINT', payload: id });
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const sortedSprints = [...sprints].sort((a, b) => {
    const aDate = a.startDate || a.endDate || '';
    const bDate = b.startDate || b.endDate || '';
    if (aDate && bDate) return aDate.localeCompare(bDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return a.createdAt - b.createdAt;
  });

  return (
    <header className="bg-[#0d0d0d] border-b-2 border-[#222] shrink-0">
      <div className="px-5 py-3 flex items-center justify-between border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-primary bg-[#0a1a14] flex items-center justify-center font-bold text-sm text-primary animate-glow-pulse">
            <span className="animate-text-flicker">S</span>
          </div>
          <span className="text-lg font-bold tracking-[0.2em] text-primary font-display text-xs">SPRELLO</span>
        </div>
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-surface-500 hover:text-primary bg-[#111] hover:bg-[#1a1a1a] px-3 py-1.5 text-xs transition-colors border border-[#333] hover:border-primary/50"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? (
            <span className="text-primary/70 text-xs">[LIGHT]</span>
          ) : (
            <span className="text-accent/70 text-xs">[DARK]</span>
          )}
        </button>
      </div>

      <div className="px-5 pb-3 pt-2 flex items-center gap-0 overflow-x-auto">
        {sortedSprints.map((sprint, i) => {
          const isActive = sprint.id === activeSprintId;
          const hasPrev = i > 0;

          return (
            <div key={sprint.id} className="flex items-center shrink-0">
              {hasPrev && (
                <span className="text-[#333] mx-1 font-mono text-xs">&gt;</span>
              )}

              <button
                onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id })}
                onDoubleClick={() => setEditingSprint(sprint)}
                className={`group relative flex items-center gap-2 px-4 py-2 transition-all shrink-0 border-2 ${
                  isActive
                    ? 'bg-[#0a1a14] border-primary text-primary shadow-[0_0_10px_rgba(0,255,204,0.2)]'
                    : 'bg-[#111] border-[#222] text-surface-400 hover:border-[#444] hover:text-surface-100'
                }`}
              >
                <span className="text-xs font-semibold truncate max-w-28 tracking-wider">{sprint.name}</span>

                {(sprint.startDate || sprint.endDate) && (
                  <span className="text-[9px] opacity-60 flex items-center gap-1 shrink-0 font-mono">
                    &#x25A0; {formatDate(sprint.startDate)}{sprint.startDate && sprint.endDate ? '-' : ''}{formatDate(sprint.endDate)}
                  </span>
                )}

                <span className="text-[9px] opacity-40 flex items-center gap-1 shrink-0 font-mono">
                  <span className="flex items-center gap-0.5">
                    &#x2630;{sprint.lists.length}
                  </span>
                  <span className="flex items-center gap-0.5">
                    &#x25A3;{sprint.lists.reduce((sum, l) => sum + l.cards.length, 0)}
                  </span>
                </span>

                {sprints.length > 1 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); deleteSprint(sprint.id); }}
                    className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-500 transition-all text-xs leading-none ml-0.5 font-mono"
                    title="Eliminar sprint"
                  >[x]</span>
                )}
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#0a1a14] hover:bg-[#0d2a1f] text-primary border-2 border-primary/30 hover:border-primary/60 px-3.5 py-2 text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ml-1 font-mono tracking-wider"
        >
          <span className="text-base leading-none">+</span> SPRINT
        </button>
      </div>

      {showNewModal && (
        <SprintModal onClose={() => setShowNewModal(false)} />
      )}
      {editingSprint && (
        <SprintModal sprint={editingSprint} onClose={() => setEditingSprint(null)} />
      )}
    </header>
  );
}
