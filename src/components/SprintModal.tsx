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
      setError('[ERROR] La fecha de inicio debe ser anterior a la de fin');
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
      setError('[ERROR] Las fechas se solapan con otro sprint');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="retro-modal-enter bg-[#0d0d0d] border-2 border-[#333] w-full max-w-md shadow-[0_0_30px_rgba(0,255,204,0.1)] mx-4">
        <div className="px-5 py-4 border-b-2 border-[#222] flex items-center justify-between bg-[#0a0a0a]">
          <h2 className="text-sm font-semibold text-primary font-mono tracking-wider">
            {isEditing ? '&gt; EDITAR_SPRINT' : '&gt; NUEVO_SPRINT'}
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-primary p-1 transition-colors font-mono text-lg leading-none">
            [X]
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#555] mb-1.5 font-mono tracking-widest uppercase">
              &gt; Nombre_
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-[#0a0a0a] border-2 border-[#333] px-3 py-2 text-sm text-surface-100 outline-none focus:border-primary placeholder-[#333] font-mono"
              placeholder="Nombre del sprint"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#555] mb-1.5 font-mono tracking-widest uppercase">
              &gt; Fechas_
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#0a0a0a] border-2 border-[#333] px-3 py-2 focus-within:border-primary">
                <DatePicker
                  selected={start}
                  onChange={d => { setStart(d); setError(''); }}
                  selectsStart
                  startDate={start ?? undefined}
                  endDate={end ?? undefined}
                  filterDate={d => !isDateBlocked(d)}
                  placeholderText="INICIO"
                  dateFormat="dd/MM/yy"
                  className="bg-transparent text-sm text-surface-100 outline-none w-full font-mono"
                  wrapperClassName="w-full"
                />
              </div>
              <span className="text-[#555] text-sm font-mono">-</span>
              <div className="flex-1 bg-[#0a0a0a] border-2 border-[#333] px-3 py-2 focus-within:border-primary">
                <DatePicker
                  selected={end}
                  onChange={d => { setEnd(d); setError(''); }}
                  selectsEnd
                  startDate={start ?? undefined}
                  endDate={end ?? undefined}
                  minDate={start ?? undefined}
                  filterDate={d => !isDateBlocked(d)}
                  placeholderText="FIN"
                  dateFormat="dd/MM/yy"
                  className="bg-transparent text-sm text-surface-100 outline-none w-full font-mono"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] bg-red-500/5 border-l-2 border-red-500 px-3 py-2 font-mono">{error}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t-2 border-[#222] flex justify-end gap-2 bg-[#0a0a0a]">
          <button
            onClick={onClose}
            className="text-[#555] hover:text-surface-100 text-xs font-semibold px-4 py-2 transition-colors font-mono tracking-wider"
          >
            [CANCEL]
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#0a1a14] hover:bg-[#0d2a1f] text-primary border-2 border-primary/40 hover:border-primary text-xs font-semibold px-4 py-2 transition-all font-mono tracking-wider"
          >
            {isEditing ? '&gt; GUARDAR' : '&gt; CREAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
