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
          dispatch({ type: 'MOVE_LIST', payload: { sprintId: sprint.id, listId: ds.listId, toIndex: targetIndex } });
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
        <div className="text-center font-mono">
          <div className="text-5xl mb-6 text-primary/30 animate-pulse">[&nbsp;&nbsp;]</div>
          <h2 className="text-lg font-semibold text-[#555] mb-2 font-mono">&gt; NO_SPRINTS_FOUND</h2>
          <p className="text-[#444] max-w-md text-xs">
            Presiona <span className="text-primary/70 font-semibold">+ SPRINT</span> en la barra superior para inicializar.
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
      listId, mouseX: e.clientX, mouseY: e.clientY,
      width: rect.width, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      listName, cardCount,
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
      className="flex-1 overflow-x-auto overflow-y-hidden p-5 relative bg-[#0a0a0a]"
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
                <div className="absolute inset-0 w-72 bg-[#0a0a0a]/60 border-2 border-dashed border-[#333] flex items-center justify-center pointer-events-none">
                  <span className="text-[#555] text-xs font-mono tracking-widest animate-pulse">[&nbsp;&nbsp;]</span>
                </div>
              )}
            </div>
          );
        })}

        {addingList ? (
          <div className="w-72 shrink-0 bg-[#111] border-2 border-primary/40 p-4">
            <input
              ref={listInputRef}
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
              className="w-full bg-[#0a0a0a] border-2 border-[#333] px-3 py-2 text-xs outline-none focus:border-primary placeholder-[#333] font-mono"
              placeholder="&gt; nombre_lista"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddList} className="bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/40 hover:border-primary/60 text-[10px] px-4 py-1.5 font-semibold transition-colors font-mono tracking-wider">ADD</button>
              <button onClick={() => { setAddingList(false); setNewListName(''); }} className="text-[#555] hover:text-surface-300 text-[10px] px-3 py-1.5 font-mono tracking-wider">CANCEL</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingList(true)} className="w-72 shrink-0 bg-[#0a0a0a] hover:bg-[#111] border-2 border-dashed border-[#333] hover:border-[#555] p-4 text-[#555] hover:text-surface-400 text-xs font-medium transition-all flex items-center justify-center gap-2 mt-0.5 font-mono tracking-wider">
            <span className="text-base">+</span> ADD_LIST
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
            transform: 'rotate(2deg)',
            opacity: 0.6,
          }}
        >
          <div className="w-full bg-[#111] border-2 border-primary/40 shadow-[0_0_20px_rgba(0,255,204,0.15)]">
            <div className="px-3 pt-3 pb-2 flex items-center gap-1 border-b border-[#222]">
              <span className="text-[#555] text-xs font-mono tracking-widest">{dragState.listName.toUpperCase()}</span>
              <span className="text-[#444] text-[10px] font-mono ml-auto">[{dragState.cardCount}]</span>
            </div>
            <div className="px-3 pb-3 pt-2 space-y-2">
              {Array.from({ length: Math.min(dragState.cardCount, 3) }).map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-[#222] px-3 py-2.5">
                  <div className={`h-1.5 bg-[#1a1a1a] ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
