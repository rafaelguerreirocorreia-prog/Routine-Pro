
import React from 'react';
import { CheckCircle2, BarChart3, PenLine, CloudRain, RotateCcw, MessageCircle } from 'lucide-react';
import { AppTab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  noPressure: boolean;
  setNoPressure: (v: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, noPressure, setNoPressure }) => {
  return (
    <div className={`min-h-screen pb-24 ${noPressure ? 'bg-neutral-900/40' : 'bg-neutral-950'} transition-all duration-700`}>
      <header className="p-6 flex justify-between items-center sticky top-0 bg-neutral-950/80 backdrop-blur-md z-40 border-b border-neutral-800">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-1">
            Routine<span className="text-emerald-500 font-black italic">PRO</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Evolução Contínua</p>
          </div>
        </div>
        
        <button 
          onClick={() => setNoPressure(!noPressure)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            noPressure 
            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600'
          }`}
        >
          <CloudRain size={14} />
          {noPressure ? 'Modo Zen ON' : 'Foco'}
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 p-2 rounded-3xl shadow-2xl z-50">
        <div className="flex justify-between items-center">
          <NavButton 
            active={activeTab === 'today'} 
            onClick={() => setActiveTab('today')} 
            icon={<CheckCircle2 size={22} />} 
            label="Hoje" 
          />
          <NavButton 
            active={activeTab === 'routine'} 
            onClick={() => setActiveTab('routine')} 
            icon={<RotateCcw size={22} />} 
            label="Plano" 
          />
          <NavButton 
            active={activeTab === 'coach'} 
            onClick={() => setActiveTab('coach')} 
            icon={<MessageCircle size={22} />} 
            label="Coach" 
          />
          <NavButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<BarChart3 size={22} />} 
            label="Dados" 
          />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 rounded-2xl ${
      active ? 'text-emerald-400 bg-emerald-400/5' : 'text-neutral-500 hover:text-neutral-300'
    }`}
  >
    <div className={`transition-transform duration-500 ${active ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
      {icon}
    </div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default Layout;
