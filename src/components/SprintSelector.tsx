import React, { useState, useRef, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useKanban, createSprintHelper, useActiveSprint } from '../store/KanbanContext';

function getDatesInRange(start: string, end: string): Date[] {
  if (!start && !end) return [];
  const s = start ? new Date(start + 'T00:00:00') : new Date(end + 'T00:00:00');
  const e = end ? new Date(end + 'T00:00:00') : new Date(start + 'T00:00:00');
  const dates: Date[] = [];
  const cur = new Date(s);
  while (cur <= e) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function SprintSelector({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const { state, dispatch } = useKanban();
  const { sprints, activeSprintId } = state;
  const activeSprint = useActiveSprint();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState<Date | null>(null);
  const [editEnd, setEditEnd] = useState<Date | null>(null);
  const [editError, setEditError] = useState('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState<Date | null>(null);
  const [newEnd, setNewEnd] = useState<Date | null>(null);
  const [newError, setNewError] = useState('');
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewForm && newNameRef.current) newNameRef.current.focus();
  }, [showNewForm]);

  const createSprint = createSprintHelper(dispatch);

  const blockedDates = useMemo(() => {
    const dates: Date[] = [];
    sprints.forEach(s => {
      if (editingId && s.id === editingId) return;
      dates.push(...getDatesInRange(s.startDate, s.endDate));
    });
    return dates;
  }, [sprints, editingId]);

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(d => d.toDateString() === date.toDateString());
  };

  const formatDateStr = (d: Date | null): string => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (newStart && newEnd && newStart > newEnd) {
      setNewError('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    const sStr = formatDateStr(newStart);
    const eStr = formatDateStr(newEnd);
    if ((sStr || eStr) && sprints.some(s => {
      const dates = getDatesInRange(s.startDate, s.endDate);
      const checkDates = getDatesInRange(sStr, eStr);
      return checkDates.some(d => dates.some(bd => bd.toDateString() === d.toDateString()));
    })) {
      setNewError('Las fechas se solapan con otro sprint');
      return;
    }
    createSprint(newName.trim(), sStr, eStr);
    setNewName('');
    setNewStart(null);
    setNewEnd(null);
    setNewError('');
    setShowNewForm(false);
  };

  const startEdit = (s: typeof sprints[0]) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditStart(s.startDate ? new Date(s.startDate + 'T00:00:00') : null);
    setEditEnd(s.endDate ? new Date(s.endDate + 'T00:00:00') : null);
    setEditError('');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    if (editStart && editEnd && editStart > editEnd) {
      setEditError('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    const sStr = formatDateStr(editStart);
    const eStr = formatDateStr(editEnd);
    dispatch({ type: 'UPDATE_SPRINT', payload: { id: editingId, name: editName.trim(), startDate: sStr, endDate: eStr } });
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

  const datePickerProps = {
    dateFormat: 'dd/MM/yy',
    className: 'bg-transparent text-xs text-surface-200 outline-none w-full',
    wrapperClassName: 'w-full',
  } as const;

  return (
    <header className="bg-surface-900 border-b border-surface-700 shrink-0">
      {/* Row 1: Logo + Name */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-primary-500/20">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">Sprello</span>
        </div>
        {activeSprint && (
          <span className="text-xs text-surface-500 bg-surface-800 rounded-lg px-3 py-1.5">
            {activeSprint.lists.length} <span className="opacity-60">cols</span>
            &nbsp;&middot;&nbsp;
            {activeSprint.lists.reduce((sum, l) => sum + l.cards.length, 0)} <span className="opacity-60">cards</span>
          </span>
        )}
      </div>

      {/* Row 2: Sprints */}
      <div className="px-5 pb-3 flex items-center gap-0 overflow-x-auto scrollbar-none">
        {sortedSprints.map((sprint, i) => {
          const isActive = sprint.id === activeSprintId;
          const isEditing = editingId === sprint.id;
          const hasPrev = i > 0 && !isEditing;

          return (
            <div key={sprint.id} className="flex items-center shrink-0">
              {hasPrev && (
                <svg className="w-4 h-4 text-surface-600 mx-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}

              {isEditing ? (
                <div className="flex flex-col gap-1.5 bg-surface-800 rounded-xl px-4 py-2.5 border border-primary-500/50 shrink-0 min-w-[260px]">
                  <input
                    value={editName}
                    onChange={e => { setEditName(e.target.value); setEditError(''); }}
                    className="bg-transparent text-sm font-semibold outline-none placeholder-surface-400"
                    placeholder="Nombre"
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5">
                    <DatePicker
                      selected={editStart}
                      onChange={d => { setEditStart(d); setEditError(''); }}
                      selectsStart
                      startDate={editStart ?? undefined}
                      endDate={editEnd ?? undefined}
                      filterDate={d => !isDateBlocked(d)}
                      placeholderText="Inicio"
                      {...datePickerProps}
                    />
                    <span className="text-surface-500 text-xs">-</span>
                    <DatePicker
                      selected={editEnd}
                      onChange={d => { setEditEnd(d); setEditError(''); }}
                      selectsEnd
                      startDate={editStart ?? undefined}
                      endDate={editEnd ?? undefined}
                      minDate={editStart ?? undefined}
                      filterDate={d => !isDateBlocked(d)}
                      placeholderText="Fin"
                      {...datePickerProps}
                    />
                  </div>
                  {editError && <p className="text-red-400 text-[10px]">{editError}</p>}
                  <div className="flex gap-1.5">
                    <button onClick={saveEdit} className="text-primary-400 hover:text-primary-300 text-xs font-medium px-2 py-0.5">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="text-surface-400 hover:text-surface-300 text-xs px-2 py-0.5">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id })}
                  onDoubleClick={() => startEdit(sprint)}
                  className={`group relative flex items-center gap-2 rounded-xl px-4 py-2 transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-primary-400/30'
                      : 'bg-surface-800/80 text-surface-300 hover:bg-surface-700 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-semibold truncate max-w-28">{sprint.name}</span>

                  {(sprint.startDate || sprint.endDate) && (
                    <span className="text-[10px] opacity-70 flex items-center gap-0.5 shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(sprint.startDate)}{sprint.startDate && sprint.endDate ? ' - ' : ''}{formatDate(sprint.endDate)}
                    </span>
                  )}

                  <span className="text-[10px] opacity-50 flex items-center gap-1 shrink-0">
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      {sprint.lists.length}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {sprint.lists.reduce((sum, l) => sum + l.cards.length, 0)}
                    </span>
                  </span>

                  {sprints.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); deleteSprint(sprint.id); }}
                      className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-400 transition-all text-sm leading-none ml-0.5"
                      title="Eliminar sprint"
                    >&times;</span>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {showNewForm ? (
          <div className="flex flex-col gap-1.5 bg-surface-800 rounded-xl px-4 py-2.5 border border-accent-500/50 shrink-0 min-w-[260px] ml-1">
            <input
              ref={newNameRef}
              value={newName}
              onChange={e => { setNewName(e.target.value); setNewError(''); }}
              className="bg-transparent text-sm font-semibold outline-none placeholder-surface-400"
              placeholder="Nombre del sprint"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex items-center gap-1.5">
              <DatePicker
                selected={newStart}
                onChange={d => { setNewStart(d); setNewError(''); }}
                selectsStart
                startDate={newStart ?? undefined}
                endDate={newEnd ?? undefined}
                filterDate={d => !isDateBlocked(d)}
                placeholderText="Inicio"
                {...datePickerProps}
              />
              <span className="text-surface-500 text-xs">-</span>
              <DatePicker
                selected={newEnd}
                onChange={d => { setNewEnd(d); setNewError(''); }}
                selectsEnd
                startDate={newStart ?? undefined}
                endDate={newEnd ?? undefined}
                minDate={newStart ?? undefined}
                filterDate={d => !isDateBlocked(d)}
                placeholderText="Fin"
                {...datePickerProps}
              />
            </div>
            {newError && <p className="text-red-400 text-[10px]">{newError}</p>}
            <div className="flex gap-1.5">
              <button onClick={handleCreate} className="bg-accent-500 hover:bg-accent-400 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors">
                Crear
              </button>
              <button onClick={() => { setShowNewForm(false); setNewError(''); setNewName(''); setNewStart(null); setNewEnd(null); }} className="text-surface-400 hover:text-surface-300 text-xs px-2 py-1">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-xl px-3.5 py-2 text-sm font-semibold shrink-0 transition-all flex items-center gap-1.5 ml-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Sprint
          </button>
        )}
      </div>
    </header>
  );
}
