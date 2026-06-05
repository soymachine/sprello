import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { KanbanState, Sprint, List, Card, Task, Comment } from '../types';

const STORAGE_KEY = 'sprello-kanban-state';

function loadState(): KanbanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sprints: [], activeSprintId: null };
}

function saveState(state: KanbanState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

type Action =
  | { type: 'LOAD_STATE'; payload: KanbanState }
  | { type: 'ADD_SPRINT'; payload: Sprint }
  | { type: 'DELETE_SPRINT'; payload: string }
  | { type: 'UPDATE_SPRINT'; payload: { id: string; name: string; startDate: string; endDate: string } }
  | { type: 'SET_ACTIVE_SPRINT'; payload: string | null }
  | { type: 'ADD_LIST'; payload: { sprintId: string; list: List } }
  | { type: 'DELETE_LIST'; payload: { sprintId: string; listId: string } }
  | { type: 'MOVE_LIST'; payload: { sprintId: string; listId: string; toIndex: number } }
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

function reducer(state: KanbanState, action: Action): KanbanState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_SPRINT':
      return { ...state, sprints: [...state.sprints, action.payload], activeSprintId: action.payload.id };

    case 'DELETE_SPRINT': {
      const filtered = state.sprints.filter(s => s.id !== action.payload);
      return {
        ...state,
        sprints: filtered,
        activeSprintId: state.activeSprintId === action.payload
          ? (filtered.length > 0 ? filtered[0].id : null)
          : state.activeSprintId,
      };
    }

    case 'UPDATE_SPRINT':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.id
            ? { ...s, name: action.payload.name, startDate: action.payload.startDate, endDate: action.payload.endDate }
            : s
        ),
      };

    case 'SET_ACTIVE_SPRINT':
      return { ...state, activeSprintId: action.payload };

    case 'ADD_LIST':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: [...s.lists, action.payload.list] }
            : s
        ),
      };

    case 'DELETE_LIST': {
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.filter(l => l.id !== action.payload.listId) }
            : s
        ),
      };
    }

    case 'MOVE_LIST': {
      const sprint = state.sprints.find(s => s.id === action.payload.sprintId);
      if (!sprint) return state;
      const idx = sprint.lists.findIndex(l => l.id === action.payload.listId);
      if (idx === -1) return state;
      const newLists = [...sprint.lists];
      const [moved] = newLists.splice(idx, 1);
      newLists.splice(action.payload.toIndex, 0, moved);
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId ? { ...s, lists: newLists } : s
        ),
      };
    }

    case 'UPDATE_LIST':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId ? { ...l, name: action.payload.name } : l
              )}
            : s
        ),
      };

    case 'ADD_CARD':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: [...l.cards, action.payload.card] }
                  : l
              )}
            : s
        ),
      };

    case 'UPDATE_CARD':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId ? { ...c, ...action.payload.data } : c
                    )}
                  : l
              )}
            : s
        ),
      };

    case 'DELETE_CARD':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.filter(c => c.id !== action.payload.cardId) }
                  : l
              )}
            : s
        ),
      };

    case 'MOVE_CARD': {
      return {
        ...state,
        sprints: state.sprints.map(s => {
          if (s.id !== action.payload.sprintId) return s;

          let movedCard: Card | undefined;
          const newLists = s.lists.map(l => {
            if (l.id === action.payload.fromListId) {
              movedCard = l.cards.find(c => c.id === action.payload.cardId);
              return { ...l, cards: l.cards.filter(c => c.id !== action.payload.cardId) };
            }
            return l;
          });

          if (!movedCard) return s;

          return {
            ...s,
            lists: newLists.map(l => {
              if (l.id === action.payload.toListId) {
                const newCards = [...l.cards];
                newCards.splice(action.payload.toIndex, 0, movedCard!);
                return { ...l, cards: newCards };
              }
              return l;
            }),
          };
        }),
      };
    }

    case 'ADD_TASK':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId
                        ? { ...c, tasks: [...c.tasks, action.payload.task] }
                        : c
                    )}
                  : l
              )}
            : s
        ),
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId
                        ? { ...c, tasks: c.tasks.map(t =>
                            t.id === action.payload.taskId ? { ...t, ...action.payload.data } : t
                          )}
                        : c
                    )}
                  : l
              )}
            : s
        ),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId
                        ? { ...c, tasks: c.tasks.filter(t => t.id !== action.payload.taskId) }
                        : c
                    )}
                  : l
              )}
            : s
        ),
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId
                        ? { ...c, comments: [...c.comments, action.payload.comment] }
                        : c
                    )}
                  : l
              )}
            : s
        ),
      };

    case 'DELETE_COMMENT':
      return {
        ...state,
        sprints: state.sprints.map(s =>
          s.id === action.payload.sprintId
            ? { ...s, lists: s.lists.map(l =>
                l.id === action.payload.listId
                  ? { ...l, cards: l.cards.map(c =>
                      c.id === action.payload.cardId
                        ? { ...c, comments: c.comments.filter(cm => cm.id !== action.payload.commentId) }
                        : c
                    )}
                  : l
              )}
            : s
        ),
      };

    default:
      return state;
  }
}

interface KanbanContextValue {
  state: KanbanState;
  dispatch: React.Dispatch<Action>;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { sprints: [], activeSprintId: null }, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <KanbanContext.Provider value={{ state, dispatch }}>
      {children}
    </KanbanContext.Provider>
  );
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

// Action helpers
export function createSprintHelper(dispatch: React.Dispatch<Action>) {
  return (name: string, startDate: string, endDate: string) => {
    const sprint: Sprint = {
      id: uuidv4(),
      name,
      startDate,
      endDate,
      lists: [],
      createdAt: Date.now(),
    };
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
    const card: Card = {
      id: uuidv4(),
      name,
      description: '',
      comments: [],
      tasks: [],
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_CARD', payload: { sprintId, listId, card } });
  };
}
