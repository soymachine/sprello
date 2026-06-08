import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { KanbanState, Sprint, List, Card, Task, Comment, CardTag, Priority } from '../types';

const STORAGE_KEY = 'sprello-kanban-state';
const MAX_HISTORY = 50;

function freshState(): KanbanState {
  return { sprints: [], activeSprintId: null, history: [], future: [] };
}

function loadState(): KanbanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sprints: parsed.sprints || [],
        activeSprintId: parsed.activeSprintId || null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        future: Array.isArray(parsed.future) ? parsed.future : [],
      };
    }
  } catch { /* ignore */ }
  return freshState();
}

function saveState(state: KanbanState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* */ }
}

type Action =
  | { type: 'SET_STATE'; payload: KanbanState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_SPRINT'; payload: Sprint }
  | { type: 'DELETE_SPRINT'; payload: string }
  | { type: 'UPDATE_SPRINT'; payload: { id: string; name: string; startDate: string; endDate: string } }
  | { type: 'MOVE_SPRINT'; payload: { sprintId: string; toIndex: number } }
  | { type: 'SET_ACTIVE_SPRINT'; payload: string | null }
  | { type: 'ADD_LIST'; payload: { sprintId: string; list: List } }
  | { type: 'DELETE_LIST'; payload: { sprintId: string; listId: string } }
  | { type: 'MOVE_LIST'; payload: { sprintId: string; listId: string; toIndex: number } }
  | { type: 'MOVE_LIST_TO_SPRINT'; payload: { fromSprintId: string; listId: string; toSprintId: string } }
  | { type: 'UPDATE_LIST'; payload: { sprintId: string; listId: string; name: string } }
  | { type: 'ADD_CARD'; payload: { sprintId: string; listId: string; card: Card } }
  | { type: 'UPDATE_CARD'; payload: { sprintId: string; listId: string; cardId: string; data: Partial<Card> } }
  | { type: 'DELETE_CARD'; payload: { sprintId: string; listId: string; cardId: string } }
  | { type: 'MOVE_CARD'; payload: { sprintId: string; fromListId: string; toListId: string; cardId: string; toIndex: number } }
  | { type: 'ADD_TASK'; payload: { sprintId: string; listId: string; cardId: string; task: Task } }
  | { type: 'UPDATE_TASK'; payload: { sprintId: string; listId: string; cardId: string; taskId: string; data: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { sprintId: string; listId: string; cardId: string; taskId: string } }
  | { type: 'ADD_COMMENT'; payload: { sprintId: string; listId: string; cardId: string; comment: Comment } }
  | { type: 'DELETE_COMMENT'; payload: { sprintId: string; listId: string; cardId: string; commentId: string } };

function pushHistory(state: KanbanState): KanbanState {
  const snapshot: KanbanState = {
    sprints: state.sprints,
    activeSprintId: state.activeSprintId,
    history: [],
    future: [],
  };
  const newHistory = [...state.history, snapshot].slice(-MAX_HISTORY);
  return { ...state, history: newHistory, future: [] };
}

function baseReducer(state: KanbanState, action: Action): KanbanState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const currentSnapshot: KanbanState = {
        sprints: state.sprints,
        activeSprintId: state.activeSprintId,
        history: [],
        future: [],
      };
      return { ...prev, history: state.history.slice(0, -1), future: [currentSnapshot, ...state.future].slice(0, MAX_HISTORY) };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const currentSnapshot: KanbanState = {
        sprints: state.sprints,
        activeSprintId: state.activeSprintId,
        history: [],
        future: [],
      };
      return { ...next, history: [...state.history, currentSnapshot].slice(-MAX_HISTORY), future: state.future.slice(1) };
    }

    case 'ADD_SPRINT':
      return { ...pushHistory(state), sprints: [...state.sprints, action.payload], activeSprintId: action.payload.id };

    case 'DELETE_SPRINT': {
      const filtered = state.sprints.filter(s => s.id !== action.payload);
      return {
        ...pushHistory(state),
        sprints: filtered,
        activeSprintId: state.activeSprintId === action.payload ? (filtered[0]?.id ?? null) : state.activeSprintId,
      };
    }

    case 'UPDATE_SPRINT':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s =>
          s.id === action.payload.id ? { ...s, name: action.payload.name, startDate: action.payload.startDate, endDate: action.payload.endDate } : s
        ),
      };

    case 'MOVE_SPRINT': {
      const idx = state.sprints.findIndex(s => s.id === action.payload.sprintId);
      if (idx === -1) return state;
      const newSprints = [...state.sprints];
      const [moved] = newSprints.splice(idx, 1);
      newSprints.splice(action.payload.toIndex, 0, moved);
      return { ...pushHistory(state), sprints: newSprints };
    }

    case 'SET_ACTIVE_SPRINT':
      return { ...state, activeSprintId: action.payload };

    case 'ADD_LIST':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: [...s.lists, action.payload.list] } : s),
      };

    case 'DELETE_LIST':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.filter(l => l.id !== action.payload.listId) } : s),
      };

    case 'MOVE_LIST': {
      const sprint = state.sprints.find(s => s.id === action.payload.sprintId);
      if (!sprint) return state;
      const idx = sprint.lists.findIndex(l => l.id === action.payload.listId);
      if (idx === -1) return state;
      const newLists = [...sprint.lists];
      const [moved] = newLists.splice(idx, 1);
      newLists.splice(action.payload.toIndex, 0, moved);
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: newLists } : s),
      };
    }

    case 'MOVE_LIST_TO_SPRINT': {
      const { fromSprintId, listId, toSprintId } = action.payload;
      if (fromSprintId === toSprintId) return state;
      let movedList: List | undefined;
      const newSprints = state.sprints.map(s => {
        if (s.id === fromSprintId) { movedList = s.lists.find(l => l.id === listId); return { ...s, lists: s.lists.filter(l => l.id !== listId) }; }
        return s;
      });
      if (!movedList) return state;
      return {
        ...pushHistory(state),
        sprints: newSprints.map(s => s.id === toSprintId ? { ...s, lists: [...s.lists, movedList!] } : s),
      };
    }

    case 'UPDATE_LIST':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, name: action.payload.name } : l) } : s),
      };

    case 'ADD_CARD':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: [...l.cards, action.payload.card] } : l) } : s),
      };

    case 'UPDATE_CARD':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, ...action.payload.data } : c) } : l) } : s),
      };

    case 'DELETE_CARD':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.filter(c => c.id !== action.payload.cardId) } : l) } : s),
      };

    case 'MOVE_CARD': {
      let movedCard: Card | undefined;
      const newSprints = state.sprints.map(s => {
        if (s.id !== action.payload.sprintId) return s;
        const newLists = s.lists.map(l => {
          if (l.id === action.payload.fromListId) { movedCard = l.cards.find(c => c.id === action.payload.cardId); return { ...l, cards: l.cards.filter(c => c.id !== action.payload.cardId) }; }
          return l;
        });
        if (!movedCard) return s;
        return { ...s, lists: newLists.map(l => l.id === action.payload.toListId ? { ...l, cards: [...l.cards.slice(0, action.payload.toIndex), movedCard!, ...l.cards.slice(action.payload.toIndex)] } : l) };
      });
      return { ...pushHistory(state), sprints: newSprints };
    }

    case 'ADD_TASK':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, tasks: [...c.tasks, action.payload.task] } : c) } : l) } : s),
      };

    case 'UPDATE_TASK':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, tasks: c.tasks.map(t => t.id === action.payload.taskId ? { ...t, ...action.payload.data } : t) } : c) } : l) } : s),
      };

    case 'DELETE_TASK':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, tasks: c.tasks.filter(t => t.id !== action.payload.taskId) } : c) } : l) } : s),
      };

    case 'ADD_COMMENT':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, comments: [...c.comments, action.payload.comment] } : c) } : l) } : s),
      };

    case 'DELETE_COMMENT':
      return {
        ...pushHistory(state),
        sprints: state.sprints.map(s => s.id === action.payload.sprintId ? { ...s, lists: s.lists.map(l => l.id === action.payload.listId ? { ...l, cards: l.cards.map(c => c.id === action.payload.cardId ? { ...c, comments: c.comments.filter(cm => cm.id !== action.payload.commentId) } : c) } : l) } : s),
      };

    default:
      return state;
  }
}

function reducer(state: KanbanState, action: Action): KanbanState {
  const next = baseReducer(state, action);
  saveState(next);
  return next;
}

interface KanbanContextValue {
  state: KanbanState;
  dispatch: React.Dispatch<Action>;
  canUndo: boolean;
  canRedo: boolean;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  const value: KanbanContextValue = {
    state,
    dispatch,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
  };

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}

export function useKanban() {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('useKanban must be used within KanbanProvider');
  return ctx;
}

export function useActiveSprint() {
  const { state: { sprints, activeSprintId } } = useKanban();
  return sprints.find(s => s.id === activeSprintId) ?? null;
}

export function createSprintHelper(dispatch: React.Dispatch<Action>) {
  return (name: string, startDate: string, endDate: string) => {
    const sprint: Sprint = { id: uuidv4(), name, startDate, endDate, lists: [], createdAt: Date.now() };
    dispatch({ type: 'ADD_SPRINT', payload: sprint });
  };
}

export function createListHelper(dispatch: React.Dispatch<Action>, sprintId: string) {
  return (name: string) => {
    const list: List = { id: uuidv4(), name, cards: [] };
    dispatch({ type: 'ADD_LIST', payload: { sprintId, list } });
  };
}

export function createCardHelper(dispatch: React.Dispatch<Action>, sprintId: string, listId: string) {
  return (name: string) => {
    const card: Card = { id: uuidv4(), name, description: '', comments: [], tasks: [], createdAt: Date.now(), tag: null, priority: null };
    dispatch({ type: 'ADD_CARD', payload: { sprintId, listId, card } });
  };
}
