import React, { useState } from 'react';
import { useKanban } from '../store/KanbanContext';

export default function Timeline({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useKanban();
  const { sprints } = state;

  const sorted = [...sprints].sort((a, b) => {
    const aDate = a.startDate || a.endDate || '';
    const bDate = b.startDate || b.endDate || '';
    if (aDate && bDate) return aDate.localeCompare(bDate);
    if (aDate) return -1;
    if (bDate) return 1;
    return a.createdAt - b.createdAt;
  });

  const allDates = sorted.flatMap(s => [s.startDate, s.endDate]).filter(Boolean);
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => new Date(d + 'T00:00:00').getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d + 'T00:00:00').getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  const getBarPosition = (sprint: typeof sprints[0]) => {
    const start = sprint.startDate ? new Date(sprint.startDate + 'T00:00:00') : minDate;
    const end = sprint.endDate ? new Date(sprint.endDate + 'T00:00:00') : maxDate;
    const left = Math.max(0, ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    const width = Math.max(2, ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100);
    const progress = sprint.lists.reduce((sum, l) => sum + l.cards.reduce((s, c) => s + (c.tasks.length > 0 ? c.tasks.filter(t => t.completed).length / c.tasks.length : 0), 0), 0);
    const totalTasks = sprint.lists.reduce((sum, l) => sum + l.cards.reduce((s, c) => s + c.tasks.length, 0), 0);
    const pct = totalTasks > 0 ? Math.round((progress / totalTasks) * 100) : 0;
    return { left, width, pct };
  };

  const formatDate = (d: string) => {
    if (!d) return '?';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  const today = new Date();
  const todayPct = totalDays > 0 ? ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100 : 50;
  const showTodayLine = today >= minDate && today <= new Date(maxDate.getTime() + 86400000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-3xl shadow-2xl mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-100">Timeline</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          {sorted.map(sprint => {
            const { left, width, pct } = getBarPosition(sprint);
            return (
              <div key={sprint.id} className="relative">
                <div className="flex items-center gap-3 mb-1">
                  <button
                    onClick={() => { dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id }); onClose(); }}
                    className="text-sm font-semibold text-surface-200 hover:text-primary-400 transition-colors text-left"
                  >
                    {sprint.name}
                  </button>
                  <span className="text-[10px] text-surface-500">
                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                  </span>
                  <span className="text-[10px] text-surface-500 ml-auto">
                    {sprint.lists.length} listas · {sprint.lists.reduce((s, l) => s + l.cards.length, 0)} tarjetas · {pct}%
                  </span>
                </div>
                <div className="relative h-6 bg-surface-700/50 overflow-hidden">
                  <div
                    className="absolute top-0 h-full bg-primary-500/30 border-r border-primary-400/50"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                  <div
                    className="absolute top-0 h-full bg-primary-500/50 transition-all"
                    style={{ left: `${left}%`, width: `${width * (pct / 100)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {showTodayLine && (
            <div className="relative h-0">
              <div className="absolute top-0 w-px h-4 bg-red-400/60 -translate-y-2" style={{ left: `${todayPct}%` }} />
              <span className="absolute text-[9px] text-red-400/60 -translate-y-5" style={{ left: `${todayPct}%`, transform: 'translateX(-50%) translateY(-100%)' }}>
                Hoy
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-surface-700/50 text-xs text-surface-500">
          {sprints.length} sprints · {formatDate(sorted[0]?.startDate)} → {formatDate(sorted[sorted.length - 1]?.endDate)}
        </div>
      </div>
    </div>
  );
}
