import React, { useState, useEffect, useRef } from 'react';
import { useKanban } from '../store/KanbanContext';
import { v4 as uuidv4 } from 'uuid';
import ChecklistItem from './ChecklistItem';
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

  const modalRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) { setEditName(card.name); setEditDesc(card.description); }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
        <div className="text-[#555] text-sm font-mono">[ERROR] TARJETA_NO_ENCONTRADA</div>
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
    dispatch({ type: 'ADD_COMMENT', payload: { sprintId, listId, cardId, comment: { id: uuidv4(), text: trimmed, createdAt: Date.now() } } });
    setNewComment('');
  };

  const deleteComment = (commentId: string) => {
    dispatch({ type: 'DELETE_COMMENT', payload: { sprintId, listId, cardId, commentId } });
  };

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_TASK', payload: { sprintId, listId, cardId, task: { id: uuidv4(), text: trimmed, completed: false } } });
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-[2px] pt-[8vh] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} className="retro-modal-enter bg-[#0d0d0d] border-2 border-[#333] w-full max-w-2xl shadow-[0_0_40px_rgba(0,255,204,0.08)] mx-4 mb-8">
        <div className="px-6 py-4 border-b-2 border-[#222] flex items-start gap-4 bg-[#0a0a0a]">
          <div className="flex-1">
            <div className="text-[9px] text-[#444] mb-1 font-mono tracking-wider">
              <span className="text-[#555]">SPRINT:</span> {sprint?.name} <span className="text-[#555]">LIST:</span> {getListName()}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(card.name); setEditingName(false); } }}
                  className="bg-[#050505] border border-[#333] px-3 py-1.5 text-base font-semibold outline-none focus:border-primary flex-1 font-mono"
                  autoFocus
                />
                <button onClick={saveName} className="text-primary hover:text-primary/70 text-xs px-2 font-mono">SAVE</button>
              </div>
            ) : (
              <h2 className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors font-mono" onDoubleClick={() => setEditingName(true)} title="Doble clic para renombrar">
                {card.name}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={deleteCard} className="text-[#444] hover:text-red-500 p-1.5 transition-colors font-mono text-xs" title="Eliminar">[DEL]</button>
            <button onClick={onClose} className="text-[#444] hover:text-surface-100 p-1.5 transition-colors font-mono text-xs">[X]</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Description */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#555] text-xs font-mono tracking-wider">&gt; DESC_</span>
            </div>
            {editingDesc ? (
              <div>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-[#050505] border border-[#333] px-3 py-2 text-xs outline-none focus:border-primary resize-none placeholder-[#333] min-h-[80px] font-mono"
                  placeholder="&gt; escribe_descripcion"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveDesc} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1.5 font-semibold transition-colors font-mono tracking-wider">SAVE</button>
                  <button onClick={() => { setEditingDesc(false); setEditDesc(card.description); }} className="text-[#555] hover:text-surface-300 text-[10px] px-2 py-1 font-mono">CANCEL</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingDesc(true)} className="text-xs text-surface-300 cursor-pointer hover:bg-[#0a0a0a] border border-transparent hover:border-[#222] px-2 py-1.5 transition-colors min-h-[32px] font-mono leading-relaxed">
                {card.description ? (
                  <p className="whitespace-pre-wrap">{card.description}</p>
                ) : (
                  <span className="text-[#333] italic">&lt;empty&gt;</span>
                )}
              </div>
            )}
          </section>

          {/* Checklist */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#555] text-xs font-mono tracking-wider">&gt; CHECKLIST_</span>
              {totalTasks > 0 && (
                <span className="text-[10px] text-[#444] font-mono">
                  [{completedTasks}/{totalTasks}]
                </span>
              )}
              {totalTasks > 0 && (
                <div className="flex-1 h-1 bg-[#1a1a1a] max-w-32">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
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
                  className="flex-1 bg-[#050505] border border-[#333] px-3 py-1.5 text-xs outline-none focus:border-primary placeholder-[#333] font-mono"
                  placeholder="&gt; nombre_tarea"
                />
                <button onClick={addTask} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1.5 font-semibold transition-colors font-mono tracking-wider">ADD</button>
                <button onClick={() => { setAddingTask(false); setNewTask(''); }} className="text-[#555] hover:text-surface-300 text-[10px] px-2 font-mono">CANCEL</button>
              </div>
            ) : (
              <button onClick={() => setAddingTask(true)} className="w-full text-left text-[10px] text-[#444] hover:text-primary border border-dashed border-transparent hover:border-[#333] px-2 py-1.5 transition-colors mt-1 font-mono tracking-wider">
                + NEW_TASK
              </button>
            )}
          </section>

          {/* Comments */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#555] text-xs font-mono tracking-wider">&gt; COMMENTS_</span>
            </div>

            <div className="flex gap-2 mt-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                className="flex-1 bg-[#050505] border border-[#333] px-3 py-2 text-xs outline-none focus:border-primary resize-none placeholder-[#333] font-mono min-h-[36px]"
                placeholder="&gt; escribe_comentario"
                rows={2}
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="bg-primary/10 hover:bg-primary/20 disabled:bg-transparent disabled:text-[#333] disabled:border-[#222] text-primary border border-primary/30 disabled:cursor-not-allowed text-[10px] px-3 py-1.5 font-semibold transition-colors self-end font-mono tracking-wider"
              >
                SEND
              </button>
            </div>

            {card.comments.length > 0 && (
              <div className="space-y-3 mt-4">
                {[...card.comments].sort((a, b) => b.createdAt - a.createdAt).map(comment => (
                  <div key={comment.id} className="flex gap-3 group border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                    <div className="w-7 h-7 border border-[#333] flex items-center justify-center text-[9px] text-[#555] shrink-0 font-mono">
                      ??
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#444] font-mono">{formatTime(comment.createdAt)}</span>
                        <button onClick={() => deleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-500 transition-all text-[9px] font-mono">[DEL]</button>
                      </div>
                      <p className="text-xs text-surface-300 mt-0.5 whitespace-pre-wrap font-mono leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-6 py-3 border-t-2 border-[#222] text-[9px] text-[#444] font-mono bg-[#0a0a0a]">
          CREATED: {new Date(card.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
