import React, { useEffect } from 'react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onConfirm, onCancel]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/40 mx-4 overflow-hidden">
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-100 mb-2">{title}</h3>
          <p className="text-sm text-surface-400">{message}</p>
        </div>
        <div className="px-6 py-3 border-t border-surface-700/50 flex justify-center gap-3 bg-surface-800/50">
          <button
            onClick={onCancel}
            className="text-surface-300 hover:text-surface-100 bg-surface-700 hover:bg-surface-600 text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            autoFocus
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
