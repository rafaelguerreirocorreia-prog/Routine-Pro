
export type TaskStatus = 'todo' | 'done' | 'partial' | 'missed';
export type Category = 'Trabalho' | 'Estudo' | 'Saúde' | 'Lazer' | 'Casa' | 'Pessoal';
export type RecurrenceType = 'none' | 'daily' | 'weekly';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  category: Category;
  priority: 'baixa' | 'média' | 'alta';
  recurrence: RecurrenceType;
  daysOfWeek?: number[]; 
  startDate: string;
  active: boolean;
  isPaused?: boolean;
  isArchived?: boolean;
  time?: string;
}

export interface Task extends TaskTemplate {
  status: TaskStatus;
  streak?: number;
  justification?: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  date: string;
  status: TaskStatus;
  justification?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Reflection {
  id: string;
  date: string;
  goodThings: string;
  challenges: string;
  improvements: string;
  mood: number;
}

export type AppTab = 'today' | 'routine' | 'coach' | 'stats';
