import React, { useState, useRef, useEffect } from 'react';
import type { Task } from '../types';
import { useKanban } from '../store/KanbanContext';

interface Props {
  sprintId: string;
  listId: string;
  cardId: string;
  task: Task;
}

export default function ChecklistItem({ sprintId, listId, cardId, task }: Props) {
  const { dispatch } = useKanban();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const toggle = () => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { sprintId, listId, cardId, taskId: task.id, data: { completed: !task.completed } },
    });
  };

  const deleteTask = () => {
    dispatch({
      type: 'DELETE_TASK',
      payload: { sprintId, listId, cardId, taskId: task.id },
    });
  };

  const saveEdit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== task.text) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { sprintId, listId, cardId, taskId: task.id, data: { text: trimmed } },
      });
    } else {
      setText(task.text);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 group py-1.5">
      <button
        onClick={toggle}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? 'bg-green-500 border-green-500'
            : 'border-surface-500 hover:border-surface-400'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') { setText(task.text); setEditing(false); }
          }}
          className="flex-1 bg-surface-700 rounded px-2 py-0.5 text-sm outline-none border border-primary-500/30"
        />
      ) : (
        <span
          className={`text-sm flex-1 cursor-pointer ${task.completed ? 'text-surface-500 line-through' : 'text-surface-200'}`}
          onDoubleClick={() => setEditing(true)}
          title="Doble clic para editar"
        >
          {task.text}
        </span>
      )}

      <button
        onClick={deleteTask}
        className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
