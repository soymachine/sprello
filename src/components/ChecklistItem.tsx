import React, { useState, useRef, useEffect } from 'react';
import type { Task } from '../types';
import { useKanban } from '../store/KanbanContext';

interface Props { sprintId: string; listId: string; cardId: string; task: Task; }

export default function ChecklistItem({ sprintId, listId, cardId, task }: Props) {
  const { dispatch } = useKanban();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const toggle = () => dispatch({ type: 'UPDATE_TASK', payload: { sprintId, listId, cardId, taskId: task.id, data: { completed: !task.completed } } });
  const deleteTask = () => dispatch({ type: 'DELETE_TASK', payload: { sprintId, listId, cardId, taskId: task.id } });
  const saveEdit = () => {
    const t = text.trim();
    if (t && t !== task.text) dispatch({ type: 'UPDATE_TASK', payload: { sprintId, listId, cardId, taskId: task.id, data: { text: t } } });
    else setText(task.text);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 group py-1.5">
      <button onClick={toggle} className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'bg-primary border-primary text-black text-[8px]' : 'border-surface-500 hover:border-primary/50'}`}>
        {task.completed && <span className="font-bold leading-none">&#x2713;</span>}
      </button>
      {editing ? (
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setText(task.text); setEditing(false); } }}
          className="flex-1 bg-surface-950 border border-surface-600 px-2 py-0.5 text-xs outline-none focus:border-primary font-mono" />
      ) : (
        <span className={`text-xs flex-1 cursor-pointer font-mono ${task.completed ? 'text-surface-500 line-through decoration-primary/30' : 'text-surface-200'}`}
          onDoubleClick={() => setEditing(true)} title="Doble clic para editar">{task.text}</span>
      )}
      <button onClick={deleteTask} className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-500 transition-all font-mono text-[10px]">[x]</button>
    </div>
  );
}
