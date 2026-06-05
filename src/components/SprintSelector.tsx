import React, { useState, useRef, useEffect } from 'react';
import { useKanban, createSprintHelper, useActiveSprint } from '../store/KanbanContext';

export default function SprintSelector({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const { state, dispatch } = useKanban();
  const { sprints, activeSprintId } = state;
  const activeSprint = useActiveSprint();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewForm && newNameRef.current) newNameRef.current.focus();
  }, [showNewForm]);

  const createSprint = createSprintHelper(dispatch);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSprint(newName.trim(), newStart, newEnd);
    setNewName('');
    setNewStart('');
    setNewEnd('');
    setShowNewForm(false);
  };

  const startEdit = (s: typeof sprints[0]) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditStart(s.startDate);
    setEditEnd(s.endDate);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    dispatch({ type: 'UPDATE_SPRINT', payload: { id: editingId, name: editName.trim(), startDate: editStart, endDate: editEnd } });
    setEditingId(null);
  };

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

  return (
    <header className="bg-surface-900 border-b border-surface-700 px-4 py-2 flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-sm">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">Sprello</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-none">
        {sprints.map((sprint, i) => (
          editingId === sprint.id ? (
            <div key={sprint.id} className="flex items-center gap-1 bg-surface-800 rounded-lg px-3 py-1.5 border border-primary-500/50 shrink-0">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none w-32 placeholder-surface-400"
                placeholder="Nombre"
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
              <input
                type="date"
                value={editStart}
                onChange={e => setEditStart(e.target.value)}
                className="bg-surface-700 text-xs rounded px-1 py-0.5 outline-none text-surface-300 w-28"
              />
              <input
                type="date"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
                className="bg-surface-700 text-xs rounded px-1 py-0.5 outline-none text-surface-300 w-28"
              />
              <button onClick={saveEdit} className="text-primary-400 hover:text-primary-300 text-xs px-1">Guardar</button>
              <button onClick={() => setEditingId(null)} className="text-surface-400 hover:text-surface-300 text-xs px-1">Cancelar</button>
            </div>
          ) : (
            <button
              key={sprint.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id })}
              onDoubleClick={() => startEdit(sprint)}
              className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all shrink-0 ${
                sprint.id === activeSprintId
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'
              }`}
            >
              <span className="max-w-32 truncate">{sprint.name}</span>
              {(sprint.startDate || sprint.endDate) && (
                <span className="text-[10px] text-surface-400">
                  {formatDate(sprint.startDate)}{sprint.startDate && sprint.endDate ? ' - ' : ''}{formatDate(sprint.endDate)}
                </span>
              )}
              <span className="text-[10px] text-surface-500 bg-surface-700 rounded-full px-1.5 py-0.5">
                {sprint.lists.length} listas
              </span>
              {sprints.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSprint(sprint.id); }}
                  className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-400 ml-1 transition-opacity text-xs"
                  title="Eliminar sprint"
                >&times;</span>
              )}
            </button>
          )
        ))}
      </div>

      {showNewForm ? (
        <div className="flex items-center gap-1.5 bg-surface-800 rounded-lg px-3 py-1.5 border border-accent-500/50 shrink-0">
          <input
            ref={newNameRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="bg-transparent text-sm outline-none w-28 placeholder-surface-400"
            placeholder="Nombre sprint"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <input
            type="date"
            value={newStart}
            onChange={e => setNewStart(e.target.value)}
            className="bg-surface-700 text-xs rounded px-1 py-0.5 outline-none text-surface-300 w-28"
          />
          <input
            type="date"
            value={newEnd}
            onChange={e => setNewEnd(e.target.value)}
            className="bg-surface-700 text-xs rounded px-1 py-0.5 outline-none text-surface-300 w-28"
          />
          <button onClick={handleCreate} className="bg-accent-500 hover:bg-accent-400 text-white text-xs px-2 py-0.5 rounded font-medium">
            Crear
          </button>
          <button onClick={() => setShowNewForm(false)} className="text-surface-400 hover:text-surface-300 text-xs px-1">Cancelar</button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-lg px-3 py-1.5 text-sm font-medium shrink-0 transition-all"
        >
          + Sprint
        </button>
      )}

      {activeSprint && (
        <div className="text-xs text-surface-500 shrink-0 px-3 py-1 rounded-md bg-surface-800 ml-2">
          {activeSprint.lists.length} listas &middot; {activeSprint.lists.reduce((sum, l) => sum + l.cards.length, 0)} tarjetas
        </div>
      )}
    </header>
  );
}
