import React, { useState, useRef, useEffect } from 'react';
import { useActiveSprint, useKanban, createListHelper } from '../store/KanbanContext';
import ListColumn from './ListColumn';

interface DragState { listId: string; mouseX: number; mouseY: number; width: number; offsetX: number; offsetY: number; listName: string; cardCount: number; }

export default function KanbanBoard({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const activeSprint = useActiveSprint();
  const { state, dispatch, canUndo, canRedo } = useKanban();

  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [forceAddCard, setForceAddCard] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const targetListIdRef = useRef<string | null>(null);
  const activeSprintRef = useRef(activeSprint);
  const listInputRef = useRef<HTMLInputElement>(null);
  const listsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { activeSprintRef.current = activeSprint; }, [activeSprint]);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);
  useEffect(() => { targetListIdRef.current = targetListId; }, [targetListId]);
  useEffect(() => { if (addingList && listInputRef.current) listInputRef.current.focus(); }, [addingList]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const sprint = activeSprintRef.current;
      if (!sprint) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) { if (canRedo) dispatch({ type: 'REDO' }); }
        else { if (canUndo) dispatch({ type: 'UNDO' }); }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (sprint.lists.length > 0) {
          setForceAddCard(v => !v);
        }
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setAddingList(true);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndo, canRedo]);

  // ... (drag handlers same as before)
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
        <div className="text-center">
          <div className="text-6xl mb-6">&#x1F4CB;</div>
          <h2 className="text-2xl font-semibold text-surface-300 mb-2">No hay sprints</h2>
          <p className="text-surface-500 max-w-md">Crea tu primer sprint con <span className="text-accent-400 font-medium">+ Sprint</span>.</p>
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

  const lists = activeSprint.lists;
  const draggedId = dragState?.listId;

  const filterCards = (cards: typeof lists[0]['cards']) => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  };

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-surface-950">
      <div className="px-5 pt-3 pb-2 flex items-center gap-3 shrink-0">
        <div className="flex-1 flex items-center gap-2">
          <svg className="w-4 h-4 text-surface-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm text-surface-200 outline-none placeholder-surface-500" placeholder="Buscar tarjetas..." />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-surface-500 hover:text-surface-300 text-xs">Limpiar</button>}
        </div>
        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} className={`text-sm px-1.5 py-0.5 transition-colors ${canUndo ? 'text-surface-400 hover:text-surface-200' : 'text-surface-600 cursor-not-allowed'}`} title="Ctrl+Z">↩</button>
        <button onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo} className={`text-sm px-1.5 py-0.5 transition-colors ${canRedo ? 'text-surface-400 hover:text-surface-200' : 'text-surface-600 cursor-not-allowed'}`} title="Ctrl+Shift+Z">↪</button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 pb-5 relative" onDragOver={handleDragOver} onDrop={handleDrop}>
        <div ref={listsContainerRef} className="flex gap-4 h-full items-start min-h-0 pb-2">
          {lists.map((list, i) => {
            const isDragging = list.id === draggedId;
            const isTarget = list.id === targetListId;
            const filteredCards = filterCards(list.cards);
            return (
              <div key={list.id} data-list-id={isDragging ? undefined : list.id} className="shrink-0 relative">
                <div className={isDragging ? 'invisible' : ''}>
                  <ListColumn
                    sprintId={activeSprint.id}
                    list={{ ...list, cards: filteredCards }}
                    onOpenCard={onOpenCard}
                    onDragStart={startListDrag}
                    isPlaceholder={false}
                    isTarget={isTarget}
                    forceAddCard={i === 0 ? forceAddCard : false}
                    onForceAddCardDone={() => setForceAddCard(false)}
                  />
                </div>
                {isDragging && (
                  <div className="absolute inset-0 w-72 bg-surface-800/20 border-2 border-dashed border-surface-600/40 flex items-center justify-center pointer-events-none">
                    <span className="text-surface-500 text-xs">Moviendo...</span>
                  </div>
                )}
              </div>
            );
          })}

          {addingList ? (
            <div className="w-72 shrink-0 bg-surface-800/50 rounded-xl border border-surface-700 p-4">
              <input ref={listInputRef} value={newListName} onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
                className="w-full bg-surface-700 rounded-lg px-3 py-2 text-sm outline-none border border-primary-500/50 placeholder-surface-400" placeholder="Nombre de la lista" />
              <div className="flex gap-2 mt-3">
                <button onClick={handleAddList} className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition-colors">Añadir</button>
                <button onClick={() => { setAddingList(false); setNewListName(''); }} className="text-surface-400 hover:text-surface-300 text-xs px-3 py-1.5">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingList(true)} className="w-72 shrink-0 bg-surface-800/20 hover:bg-surface-800/40 border border-dashed border-surface-600 hover:border-surface-500 rounded-xl p-4 text-surface-400 hover:text-surface-300 text-sm font-medium transition-all flex items-center justify-center gap-2 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Añadir lista
            </button>
          )}
        </div>

        {dragState && (
          <div className="fixed pointer-events-none z-[200]" style={{ left: dragState.mouseX - dragState.offsetX, top: dragState.mouseY - dragState.offsetY, width: dragState.width, transform: 'rotate(2deg)', opacity: 0.6 }}>
            <div className="w-full bg-surface-800 border-2 border-primary-400/50 rounded-xl shadow-2xl shadow-primary-500/20 overflow-hidden">
              <div className="px-3 pt-3 pb-2 flex items-center gap-1"><span className="text-sm font-semibold text-surface-200">{dragState.listName}</span><span className="text-xs text-surface-500 ml-auto">{dragState.cardCount}</span></div>
              <div className="px-3 pb-3 space-y-2">
                {Array.from({ length: Math.min(dragState.cardCount, 3) }).map((_, i) => (
                  <div key={i} className="bg-surface-700/80 rounded-lg px-3 py-2.5"><div className={`h-2 bg-surface-500/40 rounded ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} /></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
