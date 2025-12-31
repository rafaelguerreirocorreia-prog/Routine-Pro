
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import AuthScreen from './components/AuthScreen';
import { TaskTemplate, TaskLog, TaskStatus, Reflection, AppTab, Category, RecurrenceType, ChatMessage, User } from './types';
import { Plus, Sparkles, Send, Bot, Trash2, AlertTriangle, CalendarDays, CloudCheck, Cloud, Loader2, ShieldCheck, Database } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getCoachResponse } from './services/geminiService';
import { db } from './services/database';

const CATEGORIES: Category[] = ['Trabalho', 'Estudo', 'Saúde', 'Lazer', 'Casa', 'Pessoal'];

const App: React.FC = () => {
  // --- ESTADOS DE SESSÃO E CARREGAMENTO ---
  const [user, setUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false); 
  const [lastSync, setLastSync] = useState<number | null>(null);

  // --- ESTADOS DE DADOS ---
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [noPressure, setNoPressure] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // 1. RESTAURAÇÃO DE SESSÃO (Início absoluto)
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await db.auth.getSession();
        if (session) setUser(session);
      } catch (err) {
        console.error("Erro crítico de sessão:", err);
      } finally {
        setIsAppLoading(false);
      }
    };
    bootstrap();
  }, []);

  // 2. CARREGAMENTO DE DADOS DO COFRE (Ao logar ou restaurar)
  useEffect(() => {
    if (user && !isDataReady) {
      const loadVault = async () => {
        setIsSyncing(true);
        try {
          const vault = await db.data.fetch(user.id);
          // Atualização atómica dos estados locais
          setTemplates(vault.templates || []);
          setLogs(vault.logs || []);
          setReflections(vault.reflections || []);
          setChatHistory(vault.chatHistory || []);
          setLastSync(vault.lastUpdate || Date.now());
          
          // LIBERAÇÃO: Só agora a app pode gravar dados
          setIsDataReady(true);
        } catch (err) {
          console.error("Erro ao abrir cofre de dados:", err);
        } finally {
          setIsSyncing(false);
        }
      };
      loadVault();
    }
  }, [user, isDataReady]);

  // 3. AUTO-SAVE PERSISTENTE (Blindado contra estados vazios)
  useEffect(() => {
    if (user && isDataReady) {
      const performSync = async () => {
        setIsSyncing(true);
        try {
          await db.data.sync(user.id, {
            templates, logs, reflections, chatHistory
          });
          setLastSync(Date.now());
        } catch (err) {
          console.error("Erro na sincronização:", err);
        } finally {
          setTimeout(() => setIsSyncing(false), 800);
        }
      };

      const syncTimer = setTimeout(performSync, 2000); 
      return () => clearTimeout(syncTimer);
    }
  }, [templates, logs, reflections, chatHistory, user, isDataReady]);

  // --- LOGICA DE NEGÓCIO ---
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const dayOfWeek = todayDate.getDay();
  const formattedToday = todayDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  const getStreak = (taskId: string) => {
    let streak = 0;
    const sortedLogs = logs.filter(l => l.taskId === taskId).sort((a, b) => b.date.localeCompare(a.date));
    let currentDate = new Date();
    const hasDoneToday = sortedLogs.some(l => l.date === todayStr && l.status === 'done');
    if (!hasDoneToday) currentDate.setDate(currentDate.getDate() - 1);

    for (const log of sortedLogs) {
      const currentStr = currentDate.toISOString().split('T')[0];
      if (log.date === currentStr && log.status === 'done') {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (log.date < currentStr) break;
    }
    return streak;
  };

  const todayTasks = useMemo(() => {
    return templates
      .filter(t => t.active && !t.isArchived && !t.isPaused && (t.recurrence === 'daily' || (t.recurrence === 'weekly' && t.daysOfWeek?.includes(dayOfWeek)) || (t.recurrence === 'none' && t.startDate === todayStr)))
      .map(t => ({
        ...t,
        status: logs.find(l => l.taskId === t.id && l.date === todayStr)?.status || 'todo' as TaskStatus,
        justification: logs.find(l => l.taskId === t.id && l.date === todayStr)?.justification,
        streak: getStreak(t.id)
      }));
  }, [templates, logs, todayStr, dayOfWeek]);

  // --- HANDLERS ---
  const updateStatus = (taskId: string, targetStatus: TaskStatus, justification?: string) => {
    setLogs(prev => {
      const filtered = prev.filter(l => !(l.taskId === taskId && l.date === todayStr));
      if (targetStatus === 'todo') return filtered;
      return [{ id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, taskId, date: todayStr, status: targetStatus, justification: targetStatus === 'missed' ? justification : undefined }, ...filtered];
    });
  };

  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({ title: '', category: 'Trabalho', recurrence: 'daily', daysOfWeek: [1,2,3,4,5] });

  const addTemplate = () => {
    if (!newTemplate.title) return;
    const t: TaskTemplate = {
      id: 'task_' + Math.random().toString(36).substr(2, 9),
      title: newTemplate.title,
      category: newTemplate.category as Category || 'Trabalho',
      priority: 'média',
      recurrence: newTemplate.recurrence as RecurrenceType || 'daily',
      daysOfWeek: newTemplate.daysOfWeek,
      startDate: todayStr,
      active: true,
    };
    setTemplates(prev => [t, ...prev]);
    setIsAdding(false);
    setNewTemplate({ title: '', category: 'Trabalho', recurrence: 'daily', daysOfWeek: [1,2,3,4,5] });
  };

  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setTemplateToDelete(null);
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    setUser(null);
    setIsDataReady(false);
    setTemplates([]);
    setLogs([]);
    setReflections([]);
    setChatHistory([]);
    setActiveTab('today');
  };

  // --- COACH CHAT ---
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    try {
      const reply = await getCoachResponse(chatInput, chatHistory, templates, logs, reflections);
      setChatHistory(prev => [...prev, { role: 'model', text: reply, timestamp: Date.now() }]);
    } catch (e) {
      console.error("Erro Coach:", e);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'coach') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping, activeTab]);

  // --- RENDER LOGIC ---
  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
          <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500" size={24} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white font-black text-xl tracking-tighter uppercase">Routine<span className="text-emerald-500 italic">PRO</span></p>
          <p className="text-neutral-500 font-bold text-xs animate-pulse tracking-widest uppercase">A validar conta segura...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={(u) => { setUser(u); setIsDataReady(false); }} />;
  }

  const statsData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(l => l.date === ds);
    const done = dayLogs.filter(l => l.status === 'done').length;
    return { name: d.toLocaleDateString('pt-PT', { weekday: 'short' }), perc: dayLogs.length ? Math.round((done / dayLogs.length) * 100) : 0 };
  });

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} noPressure={noPressure} setNoPressure={setNoPressure} onLogout={handleLogout}>
      {/* Sincronizador de Nuvem */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-md border border-neutral-800 flex items-center gap-2 transition-all duration-500 z-[100] ${isSyncing ? 'opacity-100 translate-y-0 shadow-lg shadow-emerald-500/20' : 'opacity-0 -translate-y-4'}`}>
        <Cloud className={isSyncing ? "text-emerald-500 animate-pulse" : "text-neutral-500"} size={12} />
        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sincronizando...</span>
      </div>

      {!isDataReady ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
          <Loader2 className="animate-spin text-emerald-500" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">A abrir o teu cofre seguro...</p>
        </div>
      ) : (
        <>
          {activeTab === 'today' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-3xl font-black text-white tracking-tighter">Olá, {user.name} 👋</h2>
                <div className="flex items-center gap-2 text-neutral-500 font-bold text-sm bg-neutral-900/40 w-fit px-3 py-1 rounded-xl border border-neutral-800/50">
                  <CalendarDays size={14} className="text-emerald-500" />
                  <span className="capitalize">{formattedToday}</span>
                </div>
              </div>
              <div className="space-y-1">
                {todayTasks.length > 0 ? (
                  todayTasks.map(t => <TaskCard key={t.id} task={t} onUpdateStatus={updateStatus} />)
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-[40px] bg-neutral-900/10">
                    <Sparkles size={48} className="mx-auto text-neutral-800 mb-4" />
                    <p className="text-neutral-500 font-bold">Sem tarefas para hoje. Relaxa ou cria um plano.</p>
                    <button onClick={() => setActiveTab('routine')} className="text-emerald-500 mt-4 font-black uppercase text-xs tracking-widest bg-emerald-500/10 px-6 py-3 rounded-2xl hover:bg-emerald-500/20 transition-all">Definir Rotinas</button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsAdding(true)} className="fixed bottom-32 right-6 bg-emerald-500 text-black p-5 rounded-3xl shadow-2xl shadow-emerald-500/20 active:scale-90 transition-transform z-40">
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          )}

          {activeTab === 'routine' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white">O teu Plano</h2>
                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
                  {templates.length} Ativas
                </div>
              </div>
              <div className="grid gap-4">
                {templates.map(t => (
                  <div key={t.id} className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-[32px] flex items-center justify-between group">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-neutral-500 uppercase">{t.category}</span>
                        <span className="text-[9px] font-black text-emerald-500 uppercase">{t.recurrence}</span>
                      </div>
                      <h4 className="font-bold text-white">{t.title}</h4>
                    </div>
                    <button onClick={() => setTemplateToDelete(t.id)} className="p-3 rounded-2xl border border-neutral-800 text-neutral-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-20 bg-neutral-900/20 rounded-[40px] border border-neutral-800/50 border-dashed">
                    <p className="text-neutral-600 font-medium italic">Define aqui as tuas tarefas recorrentes.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'coach' && (
            <div className="flex flex-col h-[calc(100vh-160px)] relative">
              <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="text-center py-20 opacity-40">
                    <Bot size={60} className="mx-auto mb-4 text-emerald-500" />
                    <p className="font-bold text-sm text-white">Como correu o teu dia, {user.name}?</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-emerald-500 text-black font-medium' : 'bg-neutral-900 text-neutral-100 border border-neutral-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-neutral-900 p-4 rounded-3xl flex gap-1 animate-pulse"><div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" /><div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" /><div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" /></div></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="mt-4 px-1 flex gap-2 items-center sticky bottom-0 bg-neutral-950 pt-2 pb-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} placeholder="Fala com o Coach..." className="flex-1 bg-neutral-900 border border-neutral-800 rounded-3xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-emerald-500 text-white" />
                <button onClick={sendChatMessage} disabled={!chatInput.trim() || isTyping} className="bg-emerald-500 text-black p-4 rounded-2xl active:scale-95 disabled:opacity-50 transition-all shrink-0"><Send size={20} /></button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-2xl font-black text-white">Progresso</h2>
              <div className="bg-neutral-900/30 p-6 rounded-[40px] border border-neutral-800">
                <h3 className="text-[10px] font-black uppercase text-neutral-500 mb-6 tracking-widest">Sucesso Semanal (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statsData}>
                      <defs><linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="name" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '16px', fontSize: '10px'}} />
                      <Area type="monotone" dataKey="perc" stroke="#10b981" strokeWidth={4} fill="url(#colorPerc)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-neutral-900/50 rounded-[32px] border border-neutral-800 text-center"><span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Rotinas Ativas</span><p className="text-3xl font-black text-emerald-500 mt-1">{templates.length}</p></div>
                <div className="p-6 bg-neutral-900/50 rounded-[32px] border border-neutral-800 text-center"><span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Feedback Total</span><p className="text-3xl font-black text-indigo-500 mt-1">{logs.length}</p></div>
              </div>

              {/* Diagnóstico de Sistema */}
              <div className="p-8 bg-black/50 border border-neutral-800 rounded-[40px] space-y-4">
                <h4 className="text-[10px] font-black uppercase text-neutral-600 tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Estado do Sistema
                </h4>
                <div className="grid gap-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-900/50">
                    <span className="text-neutral-500">ID de Utilizador</span>
                    <span className="font-mono text-neutral-300">{user.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-900/50">
                    <span className="text-neutral-500">Sessão</span>
                    <span className="text-emerald-500 font-bold uppercase tracking-tighter">Persistente (v5)</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-neutral-500">Última Cópia de Segurança</span>
                    <span className="text-neutral-400">
                      {lastSync ? new Date(lastSync).toLocaleTimeString() : 'A carregar...'}
                    </span>
                  </div>
                </div>
                <div className="bg-emerald-500/5 p-4 rounded-2xl flex items-center gap-3">
                  <Database size={20} className="text-emerald-500" />
                  <p className="text-[10px] text-emerald-500/80 font-medium leading-tight">
                    Os teus dados estão protegidos por um cofre atómico. Fechar o Chrome nunca apagará as tuas rotinas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] p-8 w-full max-w-sm space-y-6 animate-in zoom-in-95 duration-300">
                <h3 className="text-xl font-black text-white">Novo Compromisso</h3>
                <div className="space-y-4">
                  <input autoFocus placeholder="Ex: Meditação" className="w-full bg-black border border-neutral-800 rounded-2xl p-4 font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} />
                  <div className="flex gap-2">
                    {CATEGORIES.slice(0,3).map(c => <button key={c} onClick={() => setNewTemplate({...newTemplate, category: c})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newTemplate.category === c ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-500'}`}>{c}</button>)}
                  </div>
                  <select className="w-full bg-neutral-800 p-4 rounded-2xl font-bold text-neutral-300 outline-none" value={newTemplate.recurrence} onChange={e => setNewTemplate({...newTemplate, recurrence: e.target.value as any})}><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="none">Único</option></select>
                  <button onClick={addTemplate} className="w-full bg-emerald-500 text-black p-4 rounded-2xl font-black text-lg active:scale-95 transition-transform">Guardar Plano</button>
                  <button onClick={() => setIsAdding(false)} className="w-full text-neutral-500 font-bold text-sm">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {templateToDelete && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[70] flex items-center justify-center p-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] p-8 w-full max-w-sm space-y-6 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black text-white">Remover rotina?</h3>
                <p className="text-neutral-500 text-sm px-4 leading-relaxed">Isto remove a tarefa do teu dia, mas mantém o histórico passado para estatísticas.</p>
                <div className="flex flex-col gap-3 pt-2">
                  <button onClick={() => deleteTemplate(templateToDelete)} className="w-full bg-rose-500 text-white p-4 rounded-2xl font-black text-lg active:scale-95">Sim, Eliminar</button>
                  <button onClick={() => setTemplateToDelete(null)} className="w-full text-neutral-500 font-bold text-sm">Não, manter</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
