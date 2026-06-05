import React, { useState, useRef, useEffect } from 'react';
import { useActiveSprint, useKanban, createListHelper, createCardHelper } from '../store/KanbanContext';
import ListColumn from './ListColumn';
import type { Card } from '../types';

export default function KanbanBoard({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const activeSprint = useActiveSprint();
  const { dispatch } = useKanban();

  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const listInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingList && listInputRef.current) listInputRef.current.focus();
  }, [addingList]);

  if (!activeSprint) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-2xl font-semibold text-surface-300 mb-2">No hay sprints</h2>
          <p className="text-surface-500 max-w-md">
            Crea tu primer sprint haciendo clic en <span className="text-accent-400 font-medium">+ Sprint</span> en la barra superior.
          </p>
        </div>
      </main>
    );
  }

  const createList = createListHelper(dispatch, activeSprint.id);
  const createCard = createCardHelper(dispatch, activeSprint.id, '');

  const handleAddList = () => {
    if (!newListName.trim()) return;
    createList(newListName.trim());
    setNewListName('');
    setAddingList(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBoard = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/sprello-card');
    if (!data) return;
    try {
      const { sprintId, listId, cardId } = JSON.parse(data);
      if (sprintId !== activeSprint.id) {
        // Could handle cross-sprint move, for now just re-drop
        return;
      }
      if (!activeSprint.lists.length) return;
      const targetListId = activeSprint.lists[0].id;
      dispatch({
        type: 'MOVE_CARD',
        payload: {
          sprintId: activeSprint.id,
          fromListId: listId,
          toListId: targetListId,
          cardId,
          toIndex: 0,
        },
      });
    } catch { /* */ }
  };

  return (
    <main
      className="flex-1 overflow-x-auto overflow-y-hidden p-4"
      onDragOver={handleDragOver}
      onDrop={handleDropOnBoard}
    >
      <div className="flex gap-4 h-full items-start min-h-0">
        {activeSprint.lists.map(list => (
          <ListColumn
            key={list.id}
            sprintId={activeSprint.id}
            list={list}
            onOpenCard={onOpenCard}
          />
        ))}

        {addingList ? (
          <div className="w-72 shrink-0 bg-surface-800/50 rounded-xl border border-surface-700 p-3">
            <input
              ref={listInputRef}
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
              className="w-full bg-surface-700 rounded-lg px-3 py-2 text-sm outline-none border border-primary-500/50 placeholder-surface-400"
              placeholder="Nombre de la lista"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddList}
                className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Añadir
              </button>
              <button
                onClick={() => { setAddingList(false); setNewListName(''); }}
                className="text-surface-400 hover:text-surface-300 text-xs px-3 py-1.5 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingList(true)}
            className="w-72 shrink-0 bg-surface-800/30 hover:bg-surface-800/50 border border-dashed border-surface-600 hover:border-surface-500 rounded-xl p-4 text-surface-400 hover:text-surface-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir lista
          </button>
        )}
      </div>
    </main>
  );
}
