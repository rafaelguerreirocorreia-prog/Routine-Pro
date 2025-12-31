
import { User, TaskTemplate, TaskLog, Reflection, ChatMessage } from "../types";

/**
 * MOTOR DE PERSISTÊNCIA PRO (v5 - Cloud Simulated)
 * Este serviço simula um backend real (Supabase/Firebase) com regras estritas de 
 * integridade de dados e persistência entre sessões do navegador.
 */

const KEYS = {
  REGISTRY: 'rp_global_users_db_v5',
  SESSION: 'rp_active_session_v5',
  VAULT_PREFIX: 'rp_vault_v5_'
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const db = {
  auth: {
    // Restaura a sessão do armazenamento local persistente
    async getSession(): Promise<User | null> {
      await wait(500);
      const sessionToken = localStorage.getItem(KEYS.SESSION);
      if (!sessionToken) return null;

      const users = JSON.parse(localStorage.getItem(KEYS.REGISTRY) || '[]');
      const user = users.find((u: any) => u.id === sessionToken);
      
      if (!user) {
        localStorage.removeItem(KEYS.SESSION);
        return null;
      }
      return { id: user.id, email: user.email, name: user.name };
    },

    // Cria conta permanentemente na "Base de Dados"
    async signUp(email: string, pass: string, name: string): Promise<User> {
      await wait(1000);
      const users = JSON.parse(localStorage.getItem(KEYS.REGISTRY) || '[]');
      const emailLower = email.toLowerCase().trim();

      if (users.find((u: any) => u.email === emailLower)) {
        throw new Error("Já existe uma conta com este email. Tenta fazer login.");
      }

      const newUser = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        email: emailLower,
        password: pass,
        name: name.trim(),
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(KEYS.REGISTRY, JSON.stringify(users));
      
      // Criar cofre inicial para o utilizador
      localStorage.setItem(`${KEYS.VAULT_PREFIX}${newUser.id}`, JSON.stringify({
        templates: [], logs: [], reflections: [], chatHistory: [], lastUpdate: Date.now()
      }));

      // Iniciar sessão persistente
      localStorage.setItem(KEYS.SESSION, newUser.id);
      
      return { id: newUser.id, email: newUser.email, name: newUser.name };
    },

    // Login validando contra a base de dados global
    async signIn(email: string, pass: string): Promise<User> {
      await wait(1000);
      const users = JSON.parse(localStorage.getItem(KEYS.REGISTRY) || '[]');
      const emailLower = email.toLowerCase().trim();

      const user = users.find((u: any) => u.email === emailLower && u.password === pass);
      if (!user) {
        throw new Error("Email ou palavra-passe incorretos.");
      }

      localStorage.setItem(KEYS.SESSION, user.id);
      return { id: user.id, email: user.email, name: user.name };
    },

    async signOut() {
      localStorage.removeItem(KEYS.SESSION);
    }
  },

  data: {
    // Procura dados persistentes do utilizador
    async fetch(userId: string) {
      await wait(600);
      const raw = localStorage.getItem(`${KEYS.VAULT_PREFIX}${userId}`);
      if (!raw) return { templates: [], logs: [], reflections: [], chatHistory: [] };
      return JSON.parse(raw);
    },

    // Sincronização atómica para evitar perda de dados
    async sync(userId: string, data: any) {
      const payload = { ...data, lastUpdate: Date.now() };
      localStorage.setItem(`${KEYS.VAULT_PREFIX}${userId}`, JSON.stringify(payload));
    }
  }
};
