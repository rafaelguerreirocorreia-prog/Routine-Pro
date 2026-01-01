
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, ArrowRight } from 'lucide-react';
import { db } from '../services/database';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectUser = async (userId: 'rafael' | 'ricardo') => {
    setIsLoading(true);
    try {
      const user = await db.auth.selectUser(userId);
      // Pequeno delay para feedback visual
      setTimeout(() => {
        onLogin(user);
      }, 400);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Routine<span className="text-emerald-500 italic">PRO</span>
          </h1>
          <p className="text-neutral-500 font-medium">Escolher utilizador para continuar</p>
        </div>

        <div className="grid gap-4">
          <UserButton 
            name="Rafael" 
            onClick={() => handleSelectUser('rafael')} 
            isLoading={isLoading}
          />
          <UserButton 
            name="Ricardo" 
            onClick={() => handleSelectUser('ricardo')} 
            isLoading={isLoading}
          />
        </div>

        <div className="pt-8 border-t border-neutral-900 flex flex-col items-center gap-12">
          <p className="text-center text-neutral-600 text-[11px] px-10 leading-relaxed uppercase tracking-widest font-black">
            Dados isolados e persistentes neste dispositivo
          </p>
          
          <p className="text-[10px] font-medium tracking-widest uppercase cursor-default">
            <span className="text-white opacity-40">Powered by </span>
            <span className="text-emerald-500 font-bold opacity-80">Rafael Correia</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const UserButton = ({ name, onClick, isLoading }: { name: string, onClick: () => void, isLoading: boolean }) => (
  <button 
    onClick={onClick}
    disabled={isLoading}
    className="group relative w-full bg-neutral-900 border border-neutral-800 p-8 rounded-[40px] flex items-center justify-between hover:border-emerald-500/50 hover:bg-neutral-800/50 transition-all active:scale-[0.98] disabled:opacity-50"
  >
    <div className="flex items-center gap-6">
      <div className="w-16 h-16 bg-neutral-800 rounded-3xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
        <UserIcon className="text-neutral-500 group-hover:text-black" size={32} />
      </div>
      <div className="text-left">
        <h3 className="text-2xl font-black text-white">{name}</h3>
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Entrar na conta</p>
      </div>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center group-hover:translate-x-1 transition-transform">
      <ArrowRight className="text-neutral-700 group-hover:text-emerald-500" size={24} />
    </div>
  </button>
);

export default AuthScreen;
