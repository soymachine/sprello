export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

export type CardTag = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type Priority = 'low' | 'medium' | 'high';

export interface Card {
  id: string;
  name: string;
  description: string;
  comments: Comment[];
  tasks: Task[];
  createdAt: number;
  tag: CardTag | null;
  priority: Priority | null;
}

export interface List {
  id: string;
  name: string;
  cards: Card[];
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  lists: List[];
  createdAt: number;
}

export interface KanbanState {
  sprints: Sprint[];
  activeSprintId: string | null;
  history: KanbanState[];
  future: KanbanState[];
}
