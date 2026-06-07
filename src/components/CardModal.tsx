import React, { useState, useEffect, useRef } from 'react';
import { useKanban } from '../store/KanbanContext';
import { v4 as uuidv4 } from 'uuid';
import ChecklistItem from './ChecklistItem';
import type { Card as CardType } from '../types';

interface Props { sprintId: string; listId: string; cardId: string; onClose: () => void; }

export default function CardModal({ sprintId, listId, cardId, onClose }: Props) {
  const { state, dispatch } = useKanban();
  const sprint = state.sprints.find(s => s.id === sprintId);
  const list = sprint?.lists.find(l => l.id === listId);
  const card = list?.cards.find(c => c.id === cardId);

  const [editName, setEditName] = useState(''); const [editingName, setEditingName] = useState(false);
  const [editDesc, setEditDesc] = useState(''); const [editingDesc, setEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState(''); const [addingTask, setAddingTask] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (card) { setEditName(card.name); setEditDesc(card.description); } }, [card]);
  useEffect(() => { if (addingTask && taskInputRef.current) taskInputRef.current.focus(); }, [addingTask]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  if (!card) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="text-surface-500 text-sm font-mono">[ERROR] TARJETA_NO_ENCONTRADA</div>
    </div>
  );

  const uc = (d: Partial<CardType>) => dispatch({ type: 'UPDATE_CARD', payload: { sprintId, listId, cardId, data: d } });
  const saveName = () => { const t = editName.trim(); if (t && t !== card.name) uc({ name: t }); setEditingName(false); };
  const saveDesc = () => { if (editDesc !== card.description) uc({ description: editDesc }); setEditingDesc(false); };
  const addComment = () => { const t = newComment.trim(); if (!t) return; dispatch({ type: 'ADD_COMMENT', payload: { sprintId, listId, cardId, comment: { id: uuidv4(), text: t, createdAt: Date.now() } } }); setNewComment(''); };
  const delComment = (cid: string) => dispatch({ type: 'DELETE_COMMENT', payload: { sprintId, listId, cardId, commentId: cid } });
  const addTask = () => { const t = newTask.trim(); if (!t) return; dispatch({ type: 'ADD_TASK', payload: { sprintId, listId, cardId, task: { id: uuidv4(), text: t, completed: false } } }); setNewTask(''); setAddingTask(false); };
  const deleteCard = () => { dispatch({ type: 'DELETE_CARD', payload: { sprintId, listId, cardId } }); onClose(); };

  const done = card.tasks.filter(t => t.completed).length; const total = card.tasks.length;
  const fmt = (ts: number) => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-[2px] pt-[8vh] overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="retro-modal-enter bg-surface-900 border-2 border-surface-600 w-full max-w-2xl shadow-[0_0_40px_rgba(0,255,204,0.08)] mx-4 mb-8">
        <div className="px-6 py-4 border-b-2 border-surface-700 flex items-start gap-4 bg-surface-950">
          <div className="flex-1">
            <div className="text-[9px] text-surface-500 mb-1 font-mono tracking-wider">
              <span className="text-surface-400">SPRINT:</span> {sprint?.name} <span className="text-surface-400">LIST:</span> {list?.name}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} onBlur={saveName}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditName(card.name); setEditingName(false); } }}
                  className="bg-surface-950 border border-surface-600 px-3 py-1.5 text-base font-semibold outline-none focus:border-primary flex-1 font-mono" autoFocus />
                <button onClick={saveName} className="text-primary hover:text-primary/70 text-xs px-2 font-mono">SAVE</button>
              </div>
            ) : (
              <h2 className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors font-mono" onDoubleClick={() => setEditingName(true)}>{card.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={deleteCard} className="text-surface-500 hover:text-red-500 p-1.5 transition-colors font-mono text-xs" title="Eliminar">[DEL]</button>
            <button onClick={onClose} className="text-surface-400 hover:text-surface-100 p-1.5 transition-colors font-mono text-xs">[X]</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-2"><span className="text-surface-500 text-xs font-mono tracking-wider">&gt; DESC_</span></div>
            {editingDesc ? (
              <div>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-600 px-3 py-2 text-xs outline-none focus:border-primary resize-none placeholder:text-surface-500 min-h-[80px] font-mono"
                  placeholder="&gt; escribe_descripcion" autoFocus />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveDesc} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1.5 font-semibold transition-colors font-mono tracking-wider">SAVE</button>
                  <button onClick={() => { setEditingDesc(false); setEditDesc(card.description); }} className="text-surface-500 hover:text-surface-300 text-[10px] px-2 py-1 font-mono">CANCEL</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingDesc(true)} className="text-xs text-surface-300 cursor-pointer hover:bg-surface-950 border border-transparent hover:border-surface-700 px-2 py-1.5 transition-colors min-h-[32px] font-mono leading-relaxed">
                {card.description ? <p className="whitespace-pre-wrap">{card.description}</p> : <span className="text-surface-500 italic">&lt;empty&gt;</span>}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-surface-500 text-xs font-mono tracking-wider">&gt; CHECKLIST_</span>
              {total > 0 && <span className="text-[10px] text-surface-500 font-mono">[{done}/{total}]</span>}
              {total > 0 && <div className="flex-1 h-1 bg-surface-700 max-w-32"><div className="h-full bg-primary transition-all" style={{ width: `${(done/total)*100}%` }} /></div>}
            </div>
            {card.tasks.map(t => <ChecklistItem key={t.id} sprintId={sprintId} listId={listId} cardId={cardId} task={t} />)}
            {addingTask ? (
              <div className="flex gap-2 mt-2">
                <input ref={taskInputRef} value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTask(''); } }}
                  className="flex-1 bg-surface-950 border border-surface-600 px-3 py-1.5 text-xs outline-none focus:border-primary placeholder:text-surface-500 font-mono" placeholder="&gt; nombre_tarea" />
                <button onClick={addTask} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] px-3 py-1.5 font-semibold transition-colors font-mono tracking-wider">ADD</button>
                <button onClick={() => { setAddingTask(false); setNewTask(''); }} className="text-surface-500 hover:text-surface-300 text-[10px] px-2 font-mono">CANCEL</button>
              </div>
            ) : (
              <button onClick={() => setAddingTask(true)} className="w-full text-left text-[10px] text-surface-500 hover:text-primary border border-dashed border-transparent hover:border-surface-700 px-2 py-1.5 transition-colors mt-1 font-mono tracking-wider">+ NEW_TASK</button>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3"><span className="text-surface-500 text-xs font-mono tracking-wider">&gt; COMMENTS_</span></div>
            <div className="flex gap-2 mt-2">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                className="flex-1 bg-surface-950 border border-surface-600 px-3 py-2 text-xs outline-none focus:border-primary resize-none placeholder:text-surface-500 font-mono min-h-[36px]"
                placeholder="&gt; escribe_comentario" rows={2} />
              <button onClick={addComment} disabled={!newComment.trim()}
                className="bg-primary/10 hover:bg-primary/20 disabled:bg-transparent disabled:text-surface-600 disabled:border-surface-700 text-primary border border-primary/30 disabled:cursor-not-allowed text-[10px] px-3 py-1.5 font-semibold transition-colors self-end font-mono tracking-wider">SEND</button>
            </div>
            {card.comments.length > 0 && (
              <div className="space-y-3 mt-4">
                {[...card.comments].sort((a,b) => b.createdAt - a.createdAt).map(c => (
                  <div key={c.id} className="flex gap-3 group border border-surface-800 bg-surface-950 p-3">
                    <div className="w-7 h-7 border border-surface-600 flex items-center justify-center text-[9px] text-surface-500 shrink-0 font-mono">??</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-surface-500 font-mono">{fmt(c.createdAt)}</span>
                        <button onClick={() => delComment(c.id)} className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-500 transition-all text-[9px] font-mono">[DEL]</button>
                      </div>
                      <p className="text-xs text-surface-200 mt-0.5 whitespace-pre-wrap font-mono leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-6 py-3 border-t-2 border-surface-700 text-[9px] text-surface-500 font-mono bg-surface-950">
          CREATED: {new Date(card.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
