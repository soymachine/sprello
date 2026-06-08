import React, { useState, useEffect, useRef } from 'react';
import { useKanban } from '../store/KanbanContext';
import { v4 as uuidv4 } from 'uuid';
import ChecklistItem from './ChecklistItem';
import ConfirmModal from './ConfirmModal';
import type { Card as CardType } from '../types';

interface Props {
  sprintId: string;
  listId: string;
  cardId: string;
  onClose: () => void;
}

export default function CardModal({ sprintId, listId, cardId, onClose }: Props) {
  const { state, dispatch } = useKanban();
  const sprint = state.sprints.find(s => s.id === sprintId);
  const list = sprint?.lists.find(l => l.id === listId);
  const card = list?.cards.find(c => c.id === cardId);

  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setEditName(card.name);
      setEditDesc(card.description);
    }
  }, [card]);

  useEffect(() => {
    if (addingTask && taskInputRef.current) taskInputRef.current.focus();
  }, [addingTask]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!card) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="text-surface-50 text-lg">Tarjeta no encontrada</div>
      </div>
    );
  }

  const updateCard = (data: Partial<CardType>) => {
    dispatch({ type: 'UPDATE_CARD', payload: { sprintId, listId, cardId, data } });
  };

  const saveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== card.name) updateCard({ name: trimmed });
    setEditingName(false);
  };

  const saveDesc = () => {
    if (editDesc !== card.description) updateCard({ description: editDesc });
    setEditingDesc(false);
  };

  const addComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    dispatch({
      type: 'ADD_COMMENT',
      payload: {
        sprintId, listId, cardId,
        comment: { id: uuidv4(), text: trimmed, createdAt: Date.now() },
      },
    });
    setNewComment('');
  };

  const deleteComment = (commentId: string) => {
    dispatch({ type: 'DELETE_COMMENT', payload: { sprintId, listId, cardId, commentId } });
  };

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    dispatch({
      type: 'ADD_TASK',
      payload: {
        sprintId, listId, cardId,
        task: { id: uuidv4(), text: trimmed, completed: false },
      },
    });
    setNewTask('');
    setAddingTask(false);
  };

  const deleteCard = () => {
    dispatch({ type: 'DELETE_CARD', payload: { sprintId, listId, cardId } });
    onClose();
  };

  const completedTasks = card.tasks.filter(t => t.completed).length;
  const totalTasks = card.tasks.length;

  const getListName = () => list?.name ?? '';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/40 mx-4 mb-8 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/50 flex items-start gap-4">
          <div className="flex-1">
            <div className="text-xs text-surface-500 mb-1">
              En lista <span className="text-surface-400 font-medium">{getListName()}</span>
              &nbsp;&middot;&nbsp;
              <span className="text-surface-400">Sprint: {sprint?.name}</span>
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(card.name); setEditingName(false); } }}
                  className="bg-surface-700 rounded-lg px-3 py-1.5 text-lg font-semibold outline-none border border-primary-500/50 flex-1"
                  autoFocus
                />
                <button onClick={saveName} className="text-primary-400 hover:text-primary-300 text-sm px-2">Guardar</button>
              </div>
            ) : (
              <h2
                className="text-xl font-semibold cursor-pointer hover:text-primary-400 transition-colors"
                onDoubleClick={() => setEditingName(true)}
                title="Doble clic para renombrar"
              >
                {card.name}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-surface-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
              title="Eliminar tarjeta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-surface-50 p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Description */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <h3 className="text-sm font-semibold text-surface-200">Descripción</h3>
            </div>
            {editingDesc ? (
              <div>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-surface-700 rounded-lg px-3 py-2 text-sm outline-none border border-primary-500/30 resize-none placeholder-surface-500 min-h-[80px]"
                  placeholder="Añade una descripción..."
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveDesc}
                    className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => { setEditingDesc(false); setEditDesc(card.description); }}
                    className="text-surface-400 hover:text-surface-300 text-xs px-2 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="text-sm text-surface-300 cursor-pointer hover:bg-surface-700/50 rounded-lg px-2 py-1.5 transition-colors min-h-[32px]"
              >
                {card.description ? (
                  <p className="whitespace-pre-wrap">{card.description}</p>
                ) : (
                  <span className="text-surface-500">Añade una descripción...</span>
                )}
              </div>
            )}
          </section>

          {/* Checklist */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-sm font-semibold text-surface-200">Checklist</h3>
              {totalTasks > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">{completedTasks}/{totalTasks}</span>
                    <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden max-w-32">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {card.tasks.map(task => (
              <ChecklistItem key={task.id} sprintId={sprintId} listId={listId} cardId={cardId} task={task} />
            ))}

            {addingTask ? (
              <div className="flex gap-2 mt-2">
                <input
                  ref={taskInputRef}
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTask();
                    if (e.key === 'Escape') { setAddingTask(false); setNewTask(''); }
                  }}
                  className="flex-1 bg-surface-700 rounded-lg px-3 py-1.5 text-sm outline-none border border-primary-500/30 placeholder-surface-500"
                  placeholder="Nombre de la tarea..."
                />
                <button
                  onClick={addTask}
                  className="bg-primary-500 hover:bg-primary-400 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Añadir
                </button>
                <button
                  onClick={() => { setAddingTask(false); setNewTask(''); }}
                  className="text-surface-400 hover:text-surface-300 text-xs px-2"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTask(true)}
                className="w-full text-left text-sm text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 rounded-lg px-2 py-1.5 transition-colors mt-1"
              >
                + Añadir tarea
              </button>
            )}
          </section>

          {/* Comments */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-sm font-semibold text-surface-200">Comentarios</h3>
            </div>

            <div className="flex gap-2 mt-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); }
                }}
                className="flex-1 bg-surface-700 rounded-lg px-3 py-2 text-sm outline-none border border-surface-600 focus:border-primary-500/50 resize-none placeholder-surface-500 min-h-[36px]"
                placeholder="Escribe un comentario..."
                rows={2}
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="bg-primary-500 hover:bg-primary-400 disabled:bg-surface-700 disabled:text-surface-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors self-end disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>

            {card.comments.length > 0 && (
              <div className="space-y-3 mt-4">
                {[...card.comments]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0">
                        ?
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500">{formatTime(comment.createdAt)}</span>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-all text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                        <p className="text-sm text-surface-300 mt-0.5 whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-700/50 text-xs text-surface-500">
          Creada el {new Date(card.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
      {showDeleteConfirm && (
        <ConfirmModal
          title="Eliminar tarjeta"
          message={`¿Estás seguro de que quieres eliminar "${card.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => { deleteCard(); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
