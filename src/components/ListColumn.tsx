import React, { useState, useRef, useEffect } from 'react';
import { useKanban, createCardHelper } from '../store/KanbanContext';
import CardItem from './CardItem';
import type { List } from '../types';

interface Props {
  sprintId: string;
  list: List;
  onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void;
  onDragStart?: (listId: string, e: React.DragEvent) => void;
  isPlaceholder: boolean;
}

export default function ListColumn({ sprintId, list, onOpenCard, onDragStart, isPlaceholder }: Props) {
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

  useEffect(() => {
    if (addingCard && cardInputRef.current) cardInputRef.current.focus();
  }, [addingCard]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== list.name) {
      dispatch({ type: 'UPDATE_LIST', payload: { sprintId, listId: list.id, name: trimmed } });
    } else {
      setName(list.name);
    }
    setEditingName(false);
  };

  const handleAddCard = () => {
    if (!newCardName.trim()) return;
    createCard(newCardName.trim());
    setNewCardName('');
    setAddingCard(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (listRef.current && !listRef.current.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sprello-list')) return;
    e.preventDefault();
    setDragOver(false);
    const data = e.dataTransfer.getData('application/sprello-card');
    if (!data) return;
    try {
      const { sprintId: fromSprint, listId: fromList, cardId } = JSON.parse(data);
      if (fromList === list.id) return;
      dispatch({
        type: 'MOVE_CARD',
        payload: { sprintId, fromListId: fromList, toListId: list.id, cardId, toIndex: list.cards.length },
      });
    } catch { /* */ }
  };

  const deleteList = () => {
    dispatch({ type: 'DELETE_LIST', payload: { sprintId, listId: list.id } });
  };

  const handleListDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/sprello-list', JSON.stringify({ listId: list.id }));
    e.dataTransfer.effectAllowed = 'move';

    const ghost = document.createElement('div');
    ghost.style.width = '1px';
    ghost.style.height = '1px';
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);

    onDragStart?.(list.id, e);
  };

  const handleListDragEnd = () => {
    // The board handles the drop via its own dragEnd state
  };

  const completedCards = list.cards.filter(c =>
    c.tasks.length > 0 && c.tasks.every(t => t.completed)
  ).length;

  return (
    <div
      ref={listRef}
      className={`w-72 shrink-0 flex flex-col rounded-xl transition-all max-h-full ${
        dragOver
          ? 'bg-primary-500/10 border-2 border-dashed border-primary-400'
          : 'bg-surface-800/40 border border-surface-700/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <div
          draggable
          onDragStart={handleListDragStart}
          onDragEnd={handleListDragEnd}
          className="cursor-grab active:cursor-grabbing text-surface-500 hover:text-surface-300 transition-colors p-0.5 rounded hover:bg-surface-700/50 shrink-0"
          title="Arrastrar para reordenar"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM8 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM16 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
        </div>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') { setName(list.name); setEditingName(false); }
            }}
            className="bg-surface-700 rounded px-2 py-1 text-sm font-semibold outline-none border border-primary-500/50 flex-1"
          />
        ) : (
          <button
            onDoubleClick={() => setEditingName(true)}
            className="text-sm font-semibold text-surface-200 hover:text-surface-50 truncate flex-1 text-left px-1"
            title="Doble clic para renombrar"
          >
            {list.name}
          </button>
        )}
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-surface-500 bg-surface-700 rounded-full px-1.5 py-0.5">
            {list.cards.length}
          </span>
          <button
            onClick={deleteList}
            className="text-surface-500 hover:text-red-400 text-sm px-1 py-0.5 transition-colors"
            title="Eliminar lista"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-1 space-y-2 min-h-0">
        {list.cards.map(card => (
          <CardItem
            key={card.id}
            sprintId={sprintId}
            listId={list.id}
            card={card}
            onOpenCard={onOpenCard}
          />
        ))}

        {addingCard && (
          <div className="bg-surface-700/50 rounded-lg p-2">
            <textarea
              ref={cardInputRef}
              value={newCardName}
              onChange={e => setNewCardName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                if (e.key === 'Escape') { setAddingCard(false); setNewCardName(''); }
              }}
              className="w-full bg-surface-600 rounded-lg px-3 py-2 text-sm outline-none border border-primary-500/30 resize-none placeholder-surface-400"
              placeholder="Nombre de la tarjeta..."
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddCard}
                className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Añadir
              </button>
              <button
                onClick={() => { setAddingCard(false); setNewCardName(''); }}
                className="text-surface-400 hover:text-surface-300 text-xs px-2 py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-1">
        <button
          onClick={() => setAddingCard(true)}
          className="w-full text-left text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 rounded-lg px-2 py-1.5 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir tarjeta
        </button>
      </div>
    </div>
  );
}
