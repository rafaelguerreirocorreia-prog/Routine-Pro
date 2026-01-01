
import { User, TaskTemplate, TaskLog, TaskStatus, Category, RecurrenceType } from "../types";

// Chaves de armazenamento
const STORAGE_KEYS = {
  SESSION: 'rp_active_user_id',
  DATA_PREFIX: 'rp_vault_v1_'
};

const FIXED_USERS: Record<string, User> = {
  rafael: { id: 'rafael', email: 'rafael@local', name: 'Rafael' },
  ricardo: { id: 'ricardo', email: 'ricardo@local', name: 'Ricardo' }
};

export const isConfigured = true;

export const db = {
  isConfigured: true,

  auth: {
    async getSession(): Promise<User | null> {
      const activeId = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!activeId || !FIXED_USERS[activeId]) return null;
      return FIXED_USERS[activeId];
    },

    async selectUser(userId: 'rafael' | 'ricardo'): Promise<User> {
      localStorage.setItem(STORAGE_KEYS.SESSION, userId);
      return FIXED_USERS[userId];
    },

    async signOut() {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },

  data: {
    async fetch(userId: string) {
      const vaultKey = STORAGE_KEYS.DATA_PREFIX + userId;
      const rawData = localStorage.getItem(vaultKey);
      
      if (!rawData) {
        return { templates: [], logs: [], chatHistory: [] };
      }

      return JSON.parse(rawData);
    },

    private_saveVault(userId: string, data: any) {
      const vaultKey = STORAGE_KEYS.DATA_PREFIX + userId;
      localStorage.setItem(vaultKey, JSON.stringify(data));
    },

    async saveRoutine(userId: string, routine: TaskTemplate) {
      const data = await this.fetch(userId);
      const index = data.templates.findIndex((t: any) => t.id === routine.id);
      
      if (index >= 0) {
        data.templates[index] = routine;
      } else {
        data.templates.unshift(routine);
      }
      
      this.private_saveVault(userId, data);
    },

    async deleteRoutine(userId: string, routineId: string) {
      const data = await this.fetch(userId);
      data.templates = data.templates.filter((t: any) => t.id !== routineId);
      data.logs = data.logs.filter((l: any) => l.taskId !== routineId);
      this.private_saveVault(userId, data);
    },

    async saveEntry(userId: string, entry: TaskLog) {
      const data = await this.fetch(userId);
      
      if (entry.status === 'todo') {
        // Se o estado é 'todo', removemos o log completamente da persistência
        data.logs = data.logs.filter((l: any) => l.id !== entry.id);
      } else {
        const index = data.logs.findIndex((l: any) => l.id === entry.id);
        if (index >= 0) {
          data.logs[index] = entry;
        } else {
          data.logs.push(entry);
        }
      }
      
      this.private_saveVault(userId, data);
    }
  }
};
