import React, { useState, useRef, useEffect } from 'react';
import { useActiveSprint, useKanban, createListHelper } from '../store/KanbanContext';
import ListColumn from './ListColumn';

interface DragState { listId: string; mouseX: number; mouseY: number; width: number; offsetX: number; offsetY: number; listName: string; cardCount: number; }

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
  useEffect(() => { if (addingList && listInputRef.current) listInputRef.current.focus(); }, [addingList]);

  const findTargetList = (cx: number, cy: number) => {
    const sprint = activeSprintRef.current;
    if (!sprint || !listsContainerRef.current) return;
    const ds = dragStateRef.current; if (!ds) return;
    let tid: string | null = null; let md = Infinity;
    for (const l of sprint.lists) {
      if (l.id === ds.listId) continue;
      const el = listsContainerRef.current.querySelector(`[data-list-id="${l.id}"]`); if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) { tid = l.id; break; }
      const nx = Math.max(r.left, Math.min(cx, r.right)); const ny = Math.max(r.top, Math.min(cy, r.bottom));
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < md && d < 120) { md = d; tid = l.id; }
    }
    setTargetListId(tid);
  };

  useEffect(() => {
    const h = () => {
      const ds = dragStateRef.current; const tid = targetListIdRef.current; const sp = activeSprintRef.current;
      if (ds && tid && sp) { const idx = sp.lists.findIndex(l => l.id === tid); if (idx !== -1) dispatch({ type: 'MOVE_LIST', payload: { sprintId: sp.id, listId: ds.listId, toIndex: idx } }); }
      setDragState(null); setTargetListId(null);
    };
    document.addEventListener('dragend', h);
    return () => document.removeEventListener('dragend', h);
  }, [dispatch]);

  if (!activeSprint) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center font-mono">
          <div className="text-5xl mb-6 text-primary/30 animate-pulse">[&nbsp;&nbsp;]</div>
          <h2 className="text-lg font-semibold text-surface-500 mb-2 font-mono">&gt; NO_SPRINTS_FOUND</h2>
          <p className="text-surface-600 max-w-md text-xs">Presiona <span className="text-primary/70 font-semibold">+ SPRINT</span> en la barra superior para inicializar.</p>
        </div>
      </main>
    );
  }

  const createList = createListHelper(dispatch, activeSprint.id);
  const handleAddList = () => { if (!newListName.trim()) return; createList(newListName.trim()); setNewListName(''); setAddingList(false); };

  const startListDrag = (listId: string, listName: string, cardCount: number, e: React.DragEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('[data-list-id]') as HTMLElement; if (!el) return;
    const rect = el.getBoundingClientRect();
    const s: DragState = { listId, mouseX: e.clientX, mouseY: e.clientY, width: rect.width, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, listName, cardCount };
    dragStateRef.current = s; setDragState(s); findTargetList(e.clientX, e.clientY);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (dragStateRef.current) { setDragState(p => p ? { ...p, mouseX: e.clientX, mouseY: e.clientY } : null); findTargetList(e.clientX, e.clientY); }
  };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); };

  const lists = activeSprint.lists; const draggedId = dragState?.listId;

  return (
    <main className="flex-1 overflow-x-auto overflow-y-hidden p-5 relative bg-surface-950" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div ref={listsContainerRef} className="flex gap-4 h-full items-start min-h-0 pb-2">
        {lists.map(list => {
          const isDragging = list.id === draggedId; const isTarget = list.id === targetListId;
          return (
            <div key={list.id} data-list-id={isDragging ? undefined : list.id} className="shrink-0 relative">
              <div className={isDragging ? 'invisible' : ''}>
                <ListColumn sprintId={activeSprint.id} list={list} onOpenCard={onOpenCard} onDragStart={startListDrag} isPlaceholder={false} isTarget={isTarget} />
              </div>
              {isDragging && (
                <div className="absolute inset-0 w-72 bg-surface-950/60 border-2 border-dashed border-surface-600 flex items-center justify-center pointer-events-none">
                  <span className="text-surface-500 text-xs font-mono tracking-widest animate-pulse">[&nbsp;&nbsp;]</span>
                </div>
              )}
            </div>
          );
        })}

        {addingList ? (
          <div className="w-72 shrink-0 bg-surface-800 border-2 border-primary/40 p-4">
            <input ref={listInputRef} value={newListName} onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
              className="w-full bg-surface-950 border-2 border-surface-600 px-3 py-2 text-xs outline-none focus:border-primary placeholder:text-surface-500 font-mono"
              placeholder="&gt; nombre_lista" />
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddList} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-4 py-1.5 font-semibold transition-colors font-mono tracking-wider">ADD</button>
              <button onClick={() => { setAddingList(false); setNewListName(''); }} className="text-surface-500 hover:text-surface-300 text-[10px] px-3 py-1.5 font-mono tracking-wider">CANCEL</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingList(true)} className="w-72 shrink-0 bg-surface-950 hover:bg-surface-800 border-2 border-dashed border-surface-600 hover:border-surface-500 p-4 text-surface-600 hover:text-surface-400 text-xs font-medium transition-all flex items-center justify-center gap-2 mt-0.5 font-mono tracking-wider">
            <span className="text-base">+</span> ADD_LIST
          </button>
        )}
      </div>

      {dragState && (
        <div className="fixed pointer-events-none z-[200]" style={{ left: dragState.mouseX - dragState.offsetX, top: dragState.mouseY - dragState.offsetY, width: dragState.width, transform: 'rotate(2deg)', opacity: 0.6 }}>
          <div className="w-full bg-surface-800 border-2 border-primary/40 shadow-[0_0_20px_rgba(0,255,204,0.15)]">
            <div className="px-3 pt-3 pb-2 flex items-center gap-1 border-b border-surface-700">
              <span className="text-surface-300 text-xs font-mono tracking-widest">{dragState.listName.toUpperCase()}</span>
              <span className="text-surface-500 text-[10px] font-mono ml-auto">[{dragState.cardCount}]</span>
            </div>
            <div className="px-3 pb-3 pt-2 space-y-2">
              {Array.from({ length: Math.min(dragState.cardCount, 3) }).map((_, i) => (
                <div key={i} className="bg-surface-900 border border-surface-700 px-3 py-2.5"><div className={`h-1.5 bg-surface-800 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} /></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
