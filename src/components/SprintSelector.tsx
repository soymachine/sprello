import React, { useState, useRef, useEffect } from 'react';
import { useKanban, createSprintHelper, useActiveSprint } from '../store/KanbanContext';

function datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  if (!start1 && !end1) return false;
  if (!start2 && !end2) return false;
  const s1 = start1 || end1;
  const e1 = end1 || start1;
  const s2 = start2 || end2;
  const e2 = end2 || start2;
  if (!s1 || !s2) return false;
  return s1 <= e2 && s2 <= e1;
}

export default function SprintSelector({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const { state, dispatch } = useKanban();
  const { sprints, activeSprintId } = state;
  const activeSprint = useActiveSprint();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editError, setEditError] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newError, setNewError] = useState('');
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewForm && newNameRef.current) newNameRef.current.focus();
  }, [showNewForm]);

  const createSprint = createSprintHelper(dispatch);

  const checkOverlap = (start: string, end: string, excludeId?: string): boolean => {
    return sprints.some(s => {
      if (excludeId && s.id === excludeId) return false;
      if (!s.startDate && !s.endDate) return false;
      return datesOverlap(start, end, s.startDate, s.endDate);
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const hasStart = newStart.trim();
    const hasEnd = newEnd.trim();
    if (hasStart && hasEnd && newStart > newEnd) {
      setNewError('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    if (checkOverlap(newStart, newEnd)) {
      setNewError('Las fechas se solapan con otro sprint existente');
      return;
    }
    createSprint(newName.trim(), newStart, newEnd);
    setNewName('');
    setNewStart('');
    setNewEnd('');
    setNewError('');
    setShowNewForm(false);
  };

  const startEdit = (s: typeof sprints[0]) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditStart(s.startDate);
    setEditEnd(s.endDate);
    setEditError('');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const hasStart = editStart.trim();
    const hasEnd = editEnd.trim();
    if (hasStart && hasEnd && editStart > editEnd) {
      setEditError('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    if (checkOverlap(editStart, editEnd, editingId)) {
      setEditError('Las fechas se solapan con otro sprint existente');
      return;
    }
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

  const sortedSprints = [...sprints].sort((a, b) => {
    const aDate = a.startDate || a.endDate || '';
    const bDate = b.startDate || b.endDate || '';
    if (aDate && bDate) return aDate.localeCompare(bDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return a.createdAt - b.createdAt;
  });

  return (
    <header className="bg-surface-900 border-b border-surface-700 shrink-0">
      <div className="px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 mr-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-base shadow-lg shadow-primary-500/20">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">Sprello</span>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto flex-1 scrollbar-none py-1">
          {sortedSprints.map((sprint, i) => {
            const isActive = sprint.id === activeSprintId;
            const isEditing = editingId === sprint.id;
            const prevSprint = i > 0 ? sortedSprints[i - 1] : null;
            const hasPrev = prevSprint !== null && !isEditing;

            return (
              <div key={sprint.id} className="flex items-center shrink-0">
                {hasPrev && (
                  <div className="flex items-center text-surface-600 mx-0.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex flex-col gap-1.5 bg-surface-800 rounded-xl px-4 py-2.5 border border-primary-500/50 shrink-0 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="bg-transparent text-sm font-semibold outline-none w-full placeholder-surface-400"
                        placeholder="Nombre"
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={editStart}
                        onChange={e => { setEditStart(e.target.value); setEditError(''); }}
                        className="bg-surface-700 text-xs rounded-lg px-2 py-1 outline-none text-surface-200 w-full border border-surface-600 focus:border-primary-500/50"
                      />
                      <span className="text-surface-500 text-xs">-</span>
                      <input
                        type="date"
                        value={editEnd}
                        onChange={e => { setEditEnd(e.target.value); setEditError(''); }}
                        className="bg-surface-700 text-xs rounded-lg px-2 py-1 outline-none text-surface-200 w-full border border-surface-600 focus:border-primary-500/50"
                      />
                    </div>
                    {editError && (
                      <p className="text-red-400 text-[10px]">{editError}</p>
                    )}
                    <div className="flex gap-1.5">
                      <button onClick={saveEdit} className="text-primary-400 hover:text-primary-300 text-xs font-medium px-2 py-0.5">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="text-surface-400 hover:text-surface-300 text-xs px-2 py-0.5">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id })}
                    onDoubleClick={() => startEdit(sprint)}
                    className={`group relative flex flex-col items-start gap-1 rounded-xl px-4 py-2.5 transition-all shrink-0 min-w-[140px] text-left ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-primary-400/30'
                        : 'bg-surface-800/80 text-surface-300 hover:bg-surface-700 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-semibold truncate w-full pr-4">{sprint.name}</span>
                    {(sprint.startDate || sprint.endDate) && (
                      <span className="text-[10px] opacity-70">
                        {formatDate(sprint.startDate)}{sprint.startDate && sprint.endDate ? ' - ' : ''}{formatDate(sprint.endDate)}
                      </span>
                    )}
                    <span className="text-[10px] opacity-50">
                      {sprint.lists.length} listas &middot; {sprint.lists.reduce((sum, l) => sum + l.cards.length, 0)} tarjetas
                    </span>
                    {sprints.length > 1 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteSprint(sprint.id); }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-400 transition-all text-sm leading-none p-1"
                        title="Eliminar sprint"
                      >&times;</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {showNewForm ? (
          <div className="flex flex-col gap-1.5 bg-surface-800 rounded-xl px-4 py-2.5 border border-accent-500/50 shrink-0 min-w-[220px]">
            <input
              ref={newNameRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none w-full placeholder-surface-400"
              placeholder="Nombre del sprint"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={newStart}
                onChange={e => { setNewStart(e.target.value); setNewError(''); }}
                className="bg-surface-700 text-xs rounded-lg px-2 py-1 outline-none text-surface-200 w-full border border-surface-600 focus:border-accent-500/50"
              />
              <span className="text-surface-500 text-xs">-</span>
              <input
                type="date"
                value={newEnd}
                onChange={e => { setNewEnd(e.target.value); setNewError(''); }}
                className="bg-surface-700 text-xs rounded-lg px-2 py-1 outline-none text-surface-200 w-full border border-surface-600 focus:border-accent-500/50"
              />
            </div>
            {newError && (
              <p className="text-red-400 text-[10px]">{newError}</p>
            )}
            <div className="flex gap-1.5">
              <button onClick={handleCreate} className="bg-accent-500 hover:bg-accent-400 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors">
                Crear
              </button>
              <button onClick={() => { setShowNewForm(false); setNewError(''); setNewName(''); setNewStart(''); setNewEnd(''); }} className="text-surface-400 hover:text-surface-300 text-xs px-2 py-1">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Sprint
          </button>
        )}
      </div>
    </header>
  );
}
