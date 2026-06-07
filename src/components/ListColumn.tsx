import React, { useState, useRef, useEffect } from 'react';
import { useKanban, createCardHelper } from '../store/KanbanContext';
import CardItem from './CardItem';
import type { List } from '../types';

interface Props {
  sprintId: string; list: List;
  onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void;
  onDragStart?: (listId: string, listName: string, cardCount: number, e: React.DragEvent) => void;
  isPlaceholder: boolean; isTarget?: boolean;
}

export default function ListColumn({ sprintId, list, onOpenCard, onDragStart, isTarget }: Props) {
  const { dispatch } = useKanban();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(list.name);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const createCard = createCardHelper(dispatch, sprintId, list.id);

  useEffect(() => { if (addingCard && cardInputRef.current) cardInputRef.current.focus(); }, [addingCard]);
  useEffect(() => { if (editingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select(); } }, [editingName]);

  const handleSaveName = () => {
    const t = name.trim();
    if (t && t !== list.name) dispatch({ type: 'UPDATE_LIST', payload: { sprintId, listId: list.id, name: t } });
    else setName(list.name);
    setEditingName(false);
  };
  const handleAddCard = () => { if (!newCardName.trim()) return; createCard(newCardName.trim()); setNewCardName(''); setAddingCard(false); };
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => { if (listRef.current && !listRef.current.contains(e.relatedTarget as Node)) setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault(); setDragOver(false);
    const data = e.dataTransfer.getData('application/sprello-card'); if (!data) return;
    try {
      const { listId: fromList, cardId } = JSON.parse(data);
      if (fromList === list.id) return;
      dispatch({ type: 'MOVE_CARD', payload: { sprintId, fromListId: fromList, toListId: list.id, cardId, toIndex: list.cards.length } });
    } catch {}
  };
  const deleteList = () => dispatch({ type: 'DELETE_LIST', payload: { sprintId, listId: list.id } });
  const handleListDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/sprello-list', JSON.stringify({ listId: list.id }));
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
    onDragStart?.(list.id, list.name, list.cards.length, e);
  };

  const borderClass = isTarget
    ? 'border-2 border-primary shadow-[0_0_15px_rgba(0,255,204,0.25)] bg-[#0a1a14]'
    : dragOver ? 'border-2 border-dashed border-primary/40 bg-primary/5'
    : 'border-2 border-surface-800 bg-surface-900';

  return (
    <div ref={listRef} className={`w-72 shrink-0 flex flex-col transition-all max-h-full ${borderClass}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-surface-800">
        <div draggable onDragStart={handleListDragStart}
          className="cursor-grab active:cursor-grabbing text-surface-600 hover:text-primary transition-colors p-0.5 shrink-0"
          title="Arrastrar para reordenar">
          <span className="text-[10px] font-mono select-none leading-none">:::</span>
        </div>
        {editingName ? (
          <input ref={nameInputRef} value={name} onChange={e => setName(e.target.value)} onBlur={handleSaveName}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setName(list.name); setEditingName(false); } }}
            className="bg-surface-950 border border-surface-600 px-2 py-1 text-xs font-semibold outline-none focus:border-primary flex-1 font-mono" />
        ) : (
          <button onDoubleClick={() => setEditingName(true)}
            className="text-xs font-semibold text-surface-200 hover:text-primary truncate flex-1 text-left px-1 font-mono tracking-wider"
            title="Doble clic para renombrar">{list.name.toUpperCase()}</button>
        )}
        <span className="text-[9px] text-surface-500 font-mono">{list.cards.length}</span>
        <button onClick={deleteList} className="text-surface-600 hover:text-red-500 text-xs px-1 transition-colors font-mono" title="Eliminar">[x]</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-1 space-y-2 min-h-0 pt-1">
        {list.cards.map(card => <CardItem key={card.id} sprintId={sprintId} listId={list.id} card={card} onOpenCard={onOpenCard} />)}
        {addingCard && (
          <div className="bg-surface-950 border border-surface-700 p-2">
            <textarea ref={cardInputRef} value={newCardName} onChange={e => setNewCardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); } if (e.key === 'Escape') { setAddingCard(false); setNewCardName(''); } }}
              className="w-full bg-surface-950 border border-surface-600 px-3 py-2 text-xs outline-none focus:border-primary resize-none placeholder:text-surface-500 font-mono"
              placeholder="&gt; nombre_tarjeta" rows={2} />
            <div className="flex gap-2 mt-2">
              <button onClick={handleAddCard} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1.5 font-semibold transition-colors font-mono tracking-wider">ADD</button>
              <button onClick={() => { setAddingCard(false); setNewCardName(''); }} className="text-surface-500 hover:text-surface-300 text-[10px] px-2 py-1 font-mono">CANCEL</button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-1 border-t border-surface-800">
        <button onClick={() => setAddingCard(true)} className="w-full text-left text-[10px] text-surface-500 hover:text-primary transition-colors flex items-center gap-1 font-mono tracking-wider">
          <span className="text-sm">+</span> NEW_CARD
        </button>
      </div>
    </div>
  );
}
