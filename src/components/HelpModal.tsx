import React, { useEffect } from 'react';

export default function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const shortcuts = [
    { key: 'N', desc: 'Nueva tarjeta en la primera lista' },
    { key: 'L', desc: 'Nueva lista' },
    { key: 'Esc', desc: 'Cerrar modales' },
    { key: 'Ctrl+Z', desc: 'Deshacer última acción' },
    { key: 'Ctrl+Shift+Z', desc: 'Rehacer acción deshecha' },
    { key: '?', desc: 'Mostrar esta ayuda' },
    { key: 'Doble clic', desc: 'Renombrar listas / sprints / tareas' },
    { key: 'Arrastrar', desc: 'Mover tarjetas entre listas, reordenar listas y sprints' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-100">Atajos de teclado</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-surface-300">{s.desc}</span>
              <kbd className="text-[10px] bg-surface-700 text-surface-400 px-2 py-0.5 border border-surface-600 font-mono">{s.key}</kbd>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-surface-700/50 text-xs text-surface-500">
          También puedes exportar/importar datos desde los iconos en la barra superior.
        </div>
      </div>
    </div>
  );
}
