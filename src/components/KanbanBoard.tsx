import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useActiveSprint, useKanban, createListHelper } from '../store/KanbanContext';
import ListColumn from './ListColumn';

interface DragState {
  listId: string;
  mouseX: number;
  mouseY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export default function KanbanBoard({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const activeSprint = useActiveSprint();
  const { dispatch } = useKanban();

  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const insertIndexRef = useRef<number | null>(null);
  const listInputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const listsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    insertIndexRef.current = insertIndex;
  }, [insertIndex]);

  useEffect(() => {
    const handleDragEnd = () => {
      const ds = dragStateRef.current;
      const idx = insertIndexRef.current;
      const sprint = activeSprint;
      if (ds && idx !== null && sprint) {
        dispatch({
          type: 'MOVE_LIST',
          payload: { sprintId: sprint.id, listId: ds.listId, toIndex: idx },
        });
      }
      setDragState(null);
      setInsertIndex(null);
    };
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, [dispatch]);

  useEffect(() => {
    if (addingList && listInputRef.current) listInputRef.current.focus();
  }, [addingList]);

  const handleDragOverBoard = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const types = e.dataTransfer.types;
    if (!types.includes('application/sprello-list')) return;

    if (dragState) {
      setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    }

    if (!listsContainerRef.current || !activeSprint) return;

    const containerRect = listsContainerRef.current.getBoundingClientRect();
    const children = listsContainerRef.current.children;
    const mouseX = e.clientX - containerRect.left;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.dataset.listId === dragState?.listId) continue;
      const rect = child.getBoundingClientRect();
      const childLeft = rect.left - containerRect.left;
      const childRight = rect.right - containerRect.left;
      const childCenter = childLeft + rect.width / 2;

      if (mouseX < childCenter) {
        const dist = Math.abs(mouseX - childLeft);
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
      } else {
        const dist = Math.abs(mouseX - childRight);
        if (dist < bestDist) { bestDist = dist; bestIndex = i + 1; }
      }
    }

    if (children.length === 0 || (children.length === 1 && (children[0] as HTMLElement).dataset.listId === dragState?.listId)) {
      setInsertIndex(0);
    } else {
      setInsertIndex(bestIndex);
    }
  }, [dragState, activeSprint]);

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

  const startListDrag = (listId: string, e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setDragState({
      listId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBoard = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault();
    const data = e.dataTransfer.getData('application/sprello-card');
    if (!data) return;
    try {
      const { sprintId, listId, cardId } = JSON.parse(data);
      if (sprintId !== activeSprint.id) return;
      if (!activeSprint.lists.length) return;
      const targetListId = activeSprint.lists[0].id;
      dispatch({
        type: 'MOVE_CARD',
        payload: { sprintId: activeSprint.id, fromListId: listId, toListId: targetListId, cardId, toIndex: 0 },
      });
    } catch { /* */ }
  };

  const isDraggedList = (listId: string) => dragState?.listId === listId;

  const lists = activeSprint.lists;

  const renderWithInsertMarkers = () => {
    const items: React.ReactNode[] = [];
    const draggedId = dragState?.listId;

    for (let i = 0; i <= lists.length; i++) {
      if (insertIndex === i && draggedId) {
        items.push(
          <div key={`marker-${i}`} className="shrink-0 w-1 self-stretch flex items-center justify-center">
            <div className="w-0.5 h-2/3 rounded-full bg-red-400/40 shadow-sm shadow-red-500/20" />
          </div>
        );
      }

      const list = lists[i];
      if (!list) continue;

      if (list.id !== draggedId) {
        items.push(
          <div
            key={list.id}
            data-list-id={list.id}
            className="shrink-0"
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('application/sprello-list')) return;
              // handled by board-level dragover
            }}
            onDrop={(e) => {
              if (!e.dataTransfer.types.includes('application/sprello-list')) return;
              e.preventDefault();
            }}
          >
            <ListColumn
              sprintId={activeSprint.id}
              list={list}
              onOpenCard={onOpenCard}
              onDragStart={startListDrag}
              isPlaceholder={false}
            />
          </div>
        );
      } else {
        items.push(
          <div
            key={list.id}
            data-list-id={list.id}
            className="shrink-0 w-72 h-48 bg-surface-800/20 rounded-xl border-2 border-dashed border-surface-600/40 flex items-center justify-center"
          >
            <span className="text-surface-500 text-xs">Moviendo...</span>
          </div>
        );
      }
    }

    return items;
  };

  return (
    <main
      ref={boardRef}
      className="flex-1 overflow-x-auto overflow-y-hidden p-5 relative"
      onDragOver={(e) => {
        handleDragOverBoard(e);
        handleCardDragOver(e);
      }}
      onDrop={handleDropOnBoard}
    >
      <div ref={listsContainerRef} className="flex gap-4 h-full items-start min-h-0 pb-2">
        {renderWithInsertMarkers()}

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
              <button
                onClick={handleAddList}
                className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition-colors"
              >
                Añadir
              </button>
              <button
                onClick={() => { setAddingList(false); setNewListName(''); }}
                className="text-surface-400 hover:text-surface-300 text-xs px-3 py-1.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingList(true)}
            className="w-72 shrink-0 bg-surface-800/20 hover:bg-surface-800/40 border border-dashed border-surface-600 hover:border-surface-500 rounded-xl p-4 text-surface-400 hover:text-surface-300 text-sm font-medium transition-all flex items-center justify-center gap-2 mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
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
          <div className="w-full bg-surface-800 border-2 border-primary-400/50 rounded-xl shadow-2xl shadow-primary-500/20 p-3">
            <div className="h-3 bg-surface-600 rounded w-2/3 mb-2" />
            <div className="space-y-1.5">
              <div className="h-10 bg-surface-700/80 rounded-lg" />
              <div className="h-10 bg-surface-700/80 rounded-lg" />
              <div className="h-10 bg-surface-700/80 rounded-lg w-4/5" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
