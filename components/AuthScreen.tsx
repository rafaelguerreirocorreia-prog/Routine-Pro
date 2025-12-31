
import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, ArrowRight, User as UserIcon } from 'lucide-react';
import { db } from '../services/database';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const user = await db.auth.signIn(email, password);
        onLogin(user);
      } else {
        if (!name.trim() || !email || !password) {
          throw new Error('Preenche todos os campos para continuar.');
        }
        const user = await db.auth.signUp(email, password, name);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            Routine<span className="text-emerald-500 italic">PRO</span>
          </h1>
          <p className="text-neutral-500 text-sm">A tua rotina, o teu progresso, sem pressão.</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Conectando ao servidor...</p>
              </div>
            </div>
          )}

          <div className="flex bg-black/50 p-1.5 rounded-2xl mb-8 border border-neutral-800/50">
            <button 
              onClick={() => { setMode('login'); setError(''); }} 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${mode === 'login' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('register'); setError(''); }} 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${mode === 'register' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500'}`}
            >
              Registar
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Como te chamas?</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="O teu nome" 
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" size={18} />
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all" 
                  placeholder="teu@email.com" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" size={18} />
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in zoom-in-95">
                <p className="text-rose-500 text-xs font-bold text-center">{error}</p>
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-black text-lg mt-4 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all"
            >
              {mode === 'login' ? 'Entrar Agora' : 'Criar Conta'} <ArrowRight size={20} />
            </button>
          </form>
        </div>
        <p className="text-center text-neutral-600 text-[11px] px-10 leading-relaxed">
          Os teus dados são agora guardados de forma persistente. Nunca perderás o teu progresso ao fechar o navegador.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
