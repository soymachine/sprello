import React, { useState, useRef, useEffect } from 'react';
import { useKanban } from '../store/KanbanContext';
import { useTheme } from '../store/themeStore';
import SprintModal from './SprintModal';
import Timeline from './Timeline';
import HelpModal from './HelpModal';

export default function SprintSelector({ onOpenCard }: { onOpenCard: (data: { sprintId: string; listId: string; cardId: string }) => void }) {
  const { state, dispatch } = useKanban();
  const { sprints, activeSprintId } = state;
  const { theme, toggle } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<typeof sprints[0] | null>(null);
  const [dragOverSprintId, setDragOverSprintId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' && !e.shiftKey) { e.preventDefault(); setShowHelp(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const deleteSprint = (id: string) => {
    if (sprints.length <= 1) return;
    dispatch({ type: 'DELETE_SPRINT', payload: id });
  };

  const handleSprintDragStart = (e: React.DragEvent, sprintId: string) => {
    e.dataTransfer.setData('application/sprello-sprint', sprintId);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleSprintDragOver = (e: React.DragEvent, sprintId: string) => {
    if (!e.dataTransfer.types.includes('application/sprello-sprint')) return;
    e.preventDefault();
    setDragOverSprintId(sprintId);
  };

  const handleSprintDrop = (e: React.DragEvent, targetSprintId: string) => {
    e.preventDefault();
    setDragOverSprintId(null);
    const sourceId = e.dataTransfer.getData('application/sprello-sprint');
    if (!sourceId || sourceId === targetSprintId) return;
    const targetIndex = sprints.findIndex(s => s.id === targetSprintId);
    if (targetIndex === -1) return;
    dispatch({ type: 'MOVE_SPRINT', payload: { sprintId: sourceId, toIndex: targetIndex } });
  };

  const handleSprintDragEnd = () => setDragOverSprintId(null);

  const handleExport = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprello-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (imported.sprints && Array.isArray(imported.sprints)) {
          dispatch({ type: 'SET_STATE', payload: { sprints: imported.sprints, activeSprintId: imported.activeSprintId || imported.sprints[0]?.id || null, history: [], future: [] } });
        }
      } catch { /* */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }); }
    catch { return d; }
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
      <div className="px-5 py-3 flex items-center justify-between border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-base shadow-lg shadow-primary-500/20">S</div>
          <span className="text-xl font-bold tracking-tight text-surface-50">Sprello</span>
          <span className="text-[10px] text-surface-500 ml-1 font-mono">v1.9.0</span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={handleExport} className="text-surface-500 hover:text-surface-300 text-xs px-2 py-1 transition-colors" title="Exportar datos">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-surface-500 hover:text-surface-300 text-xs px-2 py-1 transition-colors" title="Importar datos">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </button>
          <button onClick={() => setShowTimeline(true)} className="text-surface-500 hover:text-surface-300 text-xs px-2 py-1 transition-colors" title="Timeline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </button>
          <button onClick={() => setShowHelp(true)} className="text-surface-500 hover:text-surface-300 text-xs px-2 py-1 transition-colors" title="Ayuda">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={toggle} className="flex items-center gap-2 text-surface-400 hover:text-surface-100 bg-surface-800 hover:bg-surface-700 rounded-lg px-3 py-1.5 text-sm transition-colors border border-surface-700" title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className="px-5 pb-3 pt-2 flex items-center gap-0 overflow-x-auto scrollbar-none">
        {sortedSprints.map((sprint, i) => {
          const isActive = sprint.id === activeSprintId;
          return (
            <div key={sprint.id} className="flex items-center shrink-0">
              {i > 0 && <svg className="w-3.5 h-3.5 text-surface-600 mx-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
              <div
                data-sprint-id={sprint.id}
                draggable
                onDragStart={(e) => handleSprintDragStart(e, sprint.id)}
                onDragOver={(e) => handleSprintDragOver(e, sprint.id)}
                onDrop={(e) => handleSprintDrop(e, sprint.id)}
                onDragEnd={handleSprintDragEnd}
                className={`shrink-0 transition-all ${dragOverSprintId === sprint.id ? 'scale-105' : ''}`}
              >
              <button onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: sprint.id })} onDoubleClick={() => setEditingSprint(sprint)}
                className={`group relative flex items-center gap-2 rounded-xl px-4 py-2 transition-all shrink-0 ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25' : 'bg-surface-800/80 text-surface-300 hover:bg-surface-700 hover:text-surface-50'}`}>
                <span className="text-sm font-semibold truncate max-w-28">{sprint.name}</span>
                {(sprint.startDate || sprint.endDate) && (
                  <span className="text-[10px] opacity-70 flex items-center gap-0.5 shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {formatDate(sprint.startDate)}{sprint.startDate && sprint.endDate ? ' - ' : ''}{formatDate(sprint.endDate)}
                  </span>
                )}
                <span className="text-[10px] opacity-50 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>{sprint.lists.length}</span>
                  <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>{sprint.lists.reduce((sum, l) => sum + l.cards.length, 0)}</span>
                </span>
                {sprints.length > 1 && <span onClick={(e) => { e.stopPropagation(); deleteSprint(sprint.id); }} className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-400 transition-all text-sm leading-none ml-0.5" title="Eliminar sprint">&times;</span>}
              </button>
              </div>
            </div>
          );
        })}
        <button onClick={() => setShowNewModal(true)} className="bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-xl px-3.5 py-2 text-sm font-semibold shrink-0 transition-all flex items-center gap-1.5 ml-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Sprint
        </button>
      </div>

      {showNewModal && <SprintModal onClose={() => setShowNewModal(false)} />}
      {editingSprint && <SprintModal sprint={editingSprint} onClose={() => setEditingSprint(null)} />}
      {showTimeline && <Timeline onClose={() => setShowTimeline(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </header>
  );
}
