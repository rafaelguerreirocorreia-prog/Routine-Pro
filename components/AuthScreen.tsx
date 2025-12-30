
import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, ArrowRight, User as UserIcon } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');

    if (mode === 'login') {
      if (!email || !password) {
        setError('Por favor, indica o teu email e palavra-passe.');
        return;
      }
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (user) {
        onLogin({ id: user.id, email: user.email, name: user.name });
      } else {
        setError('Ups! O email ou a palavra-passe não parecem estar corretos.');
      }
    } else if (mode === 'register') {
      if (!name || !email || !password) {
        setError('Precisamos que preenchas todos os campos para começar.');
        return;
      }
      if (users.find((u: any) => u.email === email)) {
        setError('Este email já faz parte da nossa comunidade.');
        return;
      }
      const newUser = { 
        id: Math.random().toString(36).substr(2, 9), 
        email, 
        password, 
        name 
      };
      users.push(newUser);
      localStorage.setItem('mock_users', JSON.stringify(users));
      onLogin({ id: newUser.id, email: newUser.email, name: newUser.name });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-3">
          <div className="inline-flex bg-emerald-500/10 p-3 rounded-3xl mb-2">
             <h1 className="text-4xl font-black tracking-tighter text-white">
              Routine<span className="text-emerald-500 italic">PRO</span>
            </h1>
          </div>
          <p className="text-neutral-400 font-medium text-sm">
            Foca-te na consistência, nós cuidamos do resto.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
          {/* Tabs */}
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
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">O teu Nome</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-neutral-700"
                    placeholder="Como te chamamos?"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-neutral-700"
                  placeholder="teu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-neutral-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 py-3 rounded-2xl">
                <p className="text-rose-500 text-xs font-bold text-center px-4">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
            >
              {mode === 'login' ? 'Entrar Agora' : 'Começar Jornada'}
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <p className="text-center text-neutral-600 text-[11px] leading-relaxed px-10">
          Ao continuar, concordas com a nossa filosofia de auto-melhoria e foco no processo.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
