import React, { useState, useRef, useEffect } from 'react';
import { useActiveSprint, useKanban, createListHelper } from '../store/KanbanContext';
import ListColumn from './ListColumn';

interface DragState {
  listId: string;
  mouseX: number;
  mouseY: number;
  width: number;
  offsetX: number;
  offsetY: number;
  listName: string;
  cardCount: number;
}

export default function KanbanBoard({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const activeSprint = useActiveSprint();
  const { dispatch } = useKanban();

  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const targetListIdRef = useRef<string | null>(null);
  const activeSprintRef = useRef(activeSprint);
  const listInputRef = useRef<HTMLInputElement>(null);
  const listsContainerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { activeSprintRef.current = activeSprint; }, [activeSprint]);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);
  useEffect(() => { targetListIdRef.current = targetListId; }, [targetListId]);

  useEffect(() => {
    if (addingList && listInputRef.current) listInputRef.current.focus();
  }, [addingList]);

  const findTargetList = (clientX: number, clientY: number) => {
    const sprint = activeSprintRef.current;
    if (!sprint || !listsContainerRef.current) return;
    const ds = dragStateRef.current;
    if (!ds) return;

    let targetId: string | null = null;
    let minDist = Infinity;

    for (const list of sprint.lists) {
      if (list.id === ds.listId) continue;
      const el = listsContainerRef.current.querySelector(`[data-list-id="${list.id}"]`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();

      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        targetId = list.id;
        break;
      }

      const cx = Math.max(rect.left, Math.min(clientX, rect.right));
      const cy = Math.max(rect.top, Math.min(clientY, rect.bottom));
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < minDist && dist < 120) {
        minDist = dist;
        targetId = list.id;
      }
    }

    setTargetListId(targetId);
  };

  useEffect(() => {
    const onDragEnd = () => {
      const ds = dragStateRef.current;
      const targetId = targetListIdRef.current;
      const sprint = activeSprintRef.current;
      if (ds && targetId && sprint) {
        const targetIndex = sprint.lists.findIndex(l => l.id === targetId);
        if (targetIndex !== -1) {
          dispatch({
            type: 'MOVE_LIST',
            payload: { sprintId: sprint.id, listId: ds.listId, toIndex: targetIndex },
          });
        }
      }
      setDragState(null);
      setTargetListId(null);
    };
    document.addEventListener('dragend', onDragEnd);
    return () => document.removeEventListener('dragend', onDragEnd);
  }, [dispatch]);

  if (!activeSprint) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">&#x1F4CB;</div>
          <h2 className="text-2xl font-semibold text-surface-300 mb-2">No hay sprints</h2>
          <p className="text-surface-500 max-w-md">
            Crea tu primer sprint haciendo clic en <span className="text-accent-400 font-medium">+ Sprint</span> en la barra superior.
          </p>
        </div>
      </main>
    );
  }

  const createList = createListHelper(dispatch, activeSprint.id);

  const handleAddList = () => {
    if (!newListName.trim()) return;
    createList(newListName.trim());
    setNewListName('');
    setAddingList(false);
  };

  const startListDrag = (listId: string, listName: string, cardCount: number, e: React.DragEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('[data-list-id]') as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const state: DragState = {
      listId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: rect.width,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      listName,
      cardCount,
    };
    dragStateRef.current = state;
    setDragState(state);
    findTargetList(e.clientX, e.clientY);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const ds = dragStateRef.current;
    if (ds) {
      setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
      findTargetList(e.clientX, e.clientY);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const lists = activeSprint.lists;
  const draggedId = dragState?.listId;

  return (
    <main
      ref={boardRef}
      className="flex-1 overflow-x-auto overflow-y-hidden p-5 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div ref={listsContainerRef} className="flex gap-4 h-full items-start min-h-0 pb-2">
        {lists.map((list) => {
          const isDragging = list.id === draggedId;
          const isTarget = list.id === targetListId;
          return (
            <div key={list.id} data-list-id={isDragging ? undefined : list.id} className="shrink-0 relative">
              <div className={isDragging ? 'invisible' : ''}>
                <ListColumn
                  sprintId={activeSprint.id}
                  list={list}
                  onOpenCard={onOpenCard}
                  onDragStart={startListDrag}
                  isPlaceholder={false}
                  isTarget={isTarget}
                />
              </div>
              {isDragging && (
                <div className="absolute inset-0 w-72 bg-surface-800/20 rounded-xl border-2 border-dashed border-surface-600/40 flex items-center justify-center pointer-events-none">
                  <span className="text-surface-500 text-xs">Moviendo...</span>
                </div>
              )}
            </div>
          );
        })}

        {addingList ? (
          <div className="w-72 shrink-0 bg-surface-800/50 rounded-xl border border-surface-700 p-4">
            <input
              ref={listInputRef}
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
              className="w-full bg-surface-700 rounded-lg px-3 py-2 text-sm outline-none border border-primary-500/50 placeholder-surface-400"
              placeholder="Nombre de la lista"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddList} className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition-colors">Añadir</button>
              <button onClick={() => { setAddingList(false); setNewListName(''); }} className="text-surface-400 hover:text-surface-300 text-xs px-3 py-1.5">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingList(true)} className="w-72 shrink-0 bg-surface-800/20 hover:bg-surface-800/40 border border-dashed border-surface-600 hover:border-surface-500 rounded-xl p-4 text-surface-400 hover:text-surface-300 text-sm font-medium transition-all flex items-center justify-center gap-2 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Añadir lista
          </button>
        )}
      </div>

      {dragState && (
        <div
          className="fixed pointer-events-none z-[200]"
          style={{
            left: dragState.mouseX - dragState.offsetX,
            top: dragState.mouseY - dragState.offsetY,
            width: dragState.width,
            transform: 'rotate(20deg)',
            opacity: 0.5,
          }}
        >
          <div className="w-full bg-surface-800 border-2 border-primary-400/50 rounded-xl shadow-2xl shadow-primary-500/20 overflow-hidden">
            <div className="px-3 pt-3 pb-2 flex items-center gap-1">
              <div className="w-4 h-4 text-surface-500 flex items-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-surface-200 truncate">{dragState.listName}</div>
              <div className="text-xs text-surface-500 bg-surface-700 rounded-full px-1.5 py-0.5 ml-auto">{dragState.cardCount}</div>
            </div>
            <div className="px-3 pb-3 space-y-2">
              {Array.from({ length: Math.min(dragState.cardCount, 4) }).map((_, i) => (
                <div key={i} className="bg-surface-700/80 rounded-lg px-3 py-2.5">
                  <div className={`h-2 bg-surface-500/40 rounded ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
