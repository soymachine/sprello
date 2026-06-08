import React from 'react';
import { useKanban } from '../store/KanbanContext';

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

export default function Timeline({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useKanban();
  const { sprints } = state;

  const sorted = [...sprints].sort((a, b) => {
    const aD = a.startDate || a.endDate || '';
    const bD = b.startDate || b.endDate || '';
    if (aD && bD) return aD.localeCompare(bD);
    if (aD) return -1;
    if (bD) return 1;
    return a.createdAt - b.createdAt;
  });

  const allDates = sorted.flatMap(s => [s.startDate, s.endDate]).filter(Boolean);
  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => new Date(d + 'T00:00:00').getTime())))
    : new Date();
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => new Date(d + 'T00:00:00').getTime())))
    : new Date();
  const totalDays = Math.max(1, daysBetween(minDate, maxDate));

  // Build month grid
  const months: { label: string; startDay: number; days: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor <= maxDate) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const clampedEnd = monthEnd < maxDate ? monthEnd : maxDate;
    const firstDay = daysBetween(minDate, monthStart);
    const lastDay = Math.min(totalDays, daysBetween(minDate, clampedEnd));
    if (lastDay > firstDay) {
      months.push({ label: formatMonth(monthStart), startDay: firstDay, days: lastDay - firstDay + 1 });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Day numbers (abbreviated, every 7 days)
  const dayMarkers: { label: string; day: number }[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + d - 1);
    const dayNum = date.getDate();
    if (dayNum === 1 || dayNum % 7 === 0 || d === 1 || d === totalDays) {
      dayMarkers.push({ label: String(dayNum), day: d - 1 });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = daysBetween(minDate, today);
  const showToday = today >= minDate && today <= new Date(maxDate.getTime() + 86400000);
  const todayPct = showToday ? (todayDay / totalDays) * 100 : -1;

  const getBar = (s: typeof sprints[0]) => {
    const start = s.startDate ? new Date(s.startDate + 'T00:00:00') : minDate;
    const end = s.endDate ? new Date(s.endDate + 'T00:00:00') : maxDate;
    const left = Math.max(0, (daysBetween(minDate, start) / totalDays) * 100);
    const w = Math.max(2, (daysBetween(start, end) / totalDays) * 100);
    const done = s.lists.reduce((sum, l) => sum + l.cards.reduce((sc, c) => sc + (c.tasks.length > 0 ? c.tasks.filter(t => t.completed).length / c.tasks.length : 0), 0), 0);
    const total = s.lists.reduce((sum, l) => sum + l.cards.reduce((sc, c) => sc + c.tasks.length, 0), 0);
    return { left, w, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  const fmt = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }); } catch { return d; } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-800 border border-surface-600 w-full max-w-4xl shadow-2xl mx-4">
        <div className="px-6 py-4 border-b border-surface-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-100">Timeline</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white p-1.5 hover:bg-surface-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Month header row */}
        <div className="px-6 pt-4 pb-1 relative">
          <div className="relative h-5">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 text-[9px] font-semibold text-surface-400 text-center truncate" style={{ left: `${(m.startDay / totalDays) * 100}%`, width: `${(m.days / totalDays) * 100}%` }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Day markers */}
        <div className="px-6 pb-2 relative">
          <div className="relative h-3">
            {dayMarkers.map((m, i) => (
              <div key={i} className="absolute top-0 text-[7px] text-surface-600 font-mono -translate-x-1/2 select-none" style={{ left: `${(m.day / totalDays) * 100}%` }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Today marker line */}
        {showToday && (
          <div className="px-6 relative h-0">
            <div className="absolute top-0 bottom-0 w-[1px] bg-red-400/60" style={{ left: `${todayPct}%`, height: 'calc(100% + 8px)', transform: 'translateY(-4px)' }} />
            <div className="absolute -top-1 text-[8px] text-red-400 font-semibold -translate-x-1/2 px-1 bg-surface-800" style={{ left: `${todayPct}%` }}>HOY</div>
          </div>
        )}

        {/* Sprint bars */}
        <div className="px-6 py-4 space-y-3">
          {sorted.map(sprint => {
            const { left, w, pct } = getBar(sprint);
            return (
              <div key={sprint.id} className="relative pl-24">
                <div className="absolute left-6 top-0 w-20 text-xs">
                  <button onClick={() => { dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id }); onClose(); }} className="text-surface-200 hover:text-primary-400 transition-colors font-medium text-left leading-tight block truncate">
                    {sprint.name}
                  </button>
                </div>
                <div className="relative h-5 bg-surface-700/30">
                  <div className="absolute top-0 h-full bg-primary-500/15 border-r border-primary-400/30" style={{ left: `${left}%`, width: `${w}%` }} />
                  <div className="absolute top-0 h-full bg-primary-500/40 transition-all" style={{ left: `${left}%`, width: `${w * (pct / 100)}%` }} />
                  {/* Today highlight on bar */}
                  {showToday && todayDay >= 0 && (
                    (() => {
                      const sStart = sprint.startDate ? new Date(sprint.startDate + 'T00:00:00') : minDate;
                      const sEnd = sprint.endDate ? new Date(sprint.endDate + 'T00:00:00') : maxDate;
                      if (today >= sStart && today <= sEnd) {
                        const relativeDayPct = ((daysBetween(sStart, today) / Math.max(1, daysBetween(sStart, sEnd))) * 100);
                        return <div className="absolute top-0 h-full w-[2px] bg-red-400/80" style={{ left: `${left + (w * relativeDayPct / 100)}%` }} />;
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-surface-700/50 text-[10px] text-surface-500 flex items-center justify-between">
          <span>{sprints.length} sprints · {fmt(sorted[0]?.startDate)} → {fmt(sorted[sorted.length - 1]?.endDate)}</span>
          {showToday && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400/80" /> <span>Hoy</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
