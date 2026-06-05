import React, { useState, useRef, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { v4 as uuidv4 } from 'uuid';
import { useKanban } from '../store/KanbanContext';
import type { Sprint } from '../types';

interface Props {
  sprint?: Sprint;
  onClose: () => void;
}

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

export default function SprintModal({ sprint, onClose }: Props) {
  const { state, dispatch } = useKanban();
  const { sprints } = state;
  const isEditing = !!sprint;

  const [name, setName] = useState(sprint?.name ?? '');
  const [start, setStart] = useState<Date | null>(sprint?.startDate ? new Date(sprint.startDate + 'T00:00:00') : null);
  const [end, setEnd] = useState<Date | null>(sprint?.endDate ? new Date(sprint.endDate + 'T00:00:00') : null);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const blockedDates = useMemo(() => {
    const dates: Date[] = [];
    sprints.forEach(s => {
      if (isEditing && s.id === sprint!.id) return;
      dates.push(...getDatesInRange(s.startDate, s.endDate));
    });
    return dates;
  }, [sprints, isEditing, sprint]);

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

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (start && end && start > end) {
      setError('La fecha de inicio debe ser anterior a la de fin');
      return;
    }
    const sStr = formatDateStr(start);
    const eStr = formatDateStr(end);
    if ((sStr || eStr) && sprints.some(s => {
      if (isEditing && s.id === sprint!.id) return false;
      const existing = getDatesInRange(s.startDate, s.endDate);
      const check = getDatesInRange(sStr, eStr);
      return check.some(d => existing.some(bd => bd.toDateString() === d.toDateString()));
    })) {
      setError('Las fechas se solapan con otro sprint');
      return;
    }

    if (isEditing) {
      dispatch({ type: 'UPDATE_SPRINT', payload: { id: sprint!.id, name: name.trim(), startDate: sStr, endDate: eStr } });
    } else {
      const newSprint: Sprint = {
        id: uuidv4(),
        name: name.trim(),
        startDate: sStr,
        endDate: eStr,
        lists: [],
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_SPRINT', payload: newSprint });
    }
    onClose();
  };

  const dpProps = {
    dateFormat: 'dd/MM/yy',
    className: 'bg-transparent text-sm text-surface-50 outline-none w-full',
    wrapperClassName: 'w-full',
  } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl shadow-black/30 mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-600/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-50">
            {isEditing ? 'Editar Sprint' : 'Nuevo Sprint'}
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 p-1 rounded-lg hover:bg-surface-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Nombre</label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-50 outline-none focus:border-primary-500/50 placeholder-surface-500"
              placeholder="Nombre del sprint"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Fechas</label>
            <div className="flex items-center gap-2">
              <DatePicker
                selected={start}
                onChange={d => { setStart(d); setError(''); }}
                selectsStart
                startDate={start ?? undefined}
                endDate={end ?? undefined}
                filterDate={d => !isDateBlocked(d)}
                placeholderText="Inicio"
                {...dpProps}
              />
              <span className="text-surface-500 text-sm">-</span>
              <DatePicker
                selected={end}
                onChange={d => { setEnd(d); setError(''); }}
                selectsEnd
                startDate={start ?? undefined}
                endDate={end ?? undefined}
                minDate={start ?? undefined}
                filterDate={d => !isDateBlocked(d)}
                placeholderText="Fin"
                {...dpProps}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-surface-600/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-100 text-sm font-medium px-4 py-2 rounded-lg hover:bg-surface-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="bg-accent-500 hover:bg-accent-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isEditing ? 'Guardar' : 'Crear Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}
