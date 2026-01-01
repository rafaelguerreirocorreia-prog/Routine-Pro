
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import TaskCard from './components/TaskCard';
import AuthScreen from './components/AuthScreen';
import { TaskTemplate, TaskLog, TaskStatus, Reflection, AppTab, Category, RecurrenceType, ChatMessage, User, Task, DayPeriod } from './types';
import { Plus, Sparkles, Send, Bot, Trash2, CalendarDays, Loader2, ShieldCheck, Database, HardDrive, AlertTriangle, Sunrise, Sun, Moon, Edit3, Flame, Infinity, Calendar, Check, Clock, Heart, Gamepad2, Briefcase, Home, BookOpen } from 'lucide-react';
import { getCoachResponse } from './services/geminiService';
import { db } from './services/database';

const CATEGORY_CONFIG: Record<Category, { icon: any, color: string, bg: string }> = {
  'Saúde': { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  'Lazer': { icon: Gamepad2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'Trabalho': { icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Casa': { icon: Home, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'Estudo': { icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
};

const CATEGORIES: Category[] = ['Saúde', 'Lazer', 'Trabalho', 'Casa', 'Estudo'];

const WEEKDAYS = [
  { val: 1, label: 'S' }, { val: 2, label: 'T' }, { val: 3, label: 'Q' }, 
  { val: 4, label: 'Q' }, { val: 5, label: 'S' }, { val: 6, label: 'S' }, { val: 0, label: 'D' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false); 
  const [lastSync, setLastSync] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [noPressure, setNoPressure] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({ 
    title: '', 
    category: 'Saúde', 
    recurrence: 'daily',
    period: 'day',
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString().split('T')[0]
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await db.auth.getSession();
        if (session) setUser(session);
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setIsAppLoading(false), 800);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (user && !isDataReady) {
      const loadLocalData = async () => {
        setIsSyncing(true);
        try {
          const data = await db.data.fetch(user.id);
          setTemplates(data.templates || []);
          setLogs(data.logs || []);
          setLastSync(Date.now());
          setIsDataReady(true);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSyncing(false);
        }
      };
      loadLocalData();
    }
  }, [user, isDataReady]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  const isTaskScheduledForDate = (t: TaskTemplate, dateStr: string) => {
    if (!t.active || t.isArchived) return false;
    if (t.recurrence === 'daily') return true;
    if (t.recurrence === 'specific') return t.startDate === dateStr;
    if (t.recurrence === 'weekly') {
      const d = new Date(dateStr);
      const day = d.getDay();
      return t.daysOfWeek?.includes(day);
    }
    return false;
  };

  const calculateStreak = (taskId: string) => {
    const taskLogs = logs.filter(l => l.taskId === taskId).sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const t = templates.find(temp => temp.id === taskId);
      if (!t || !isTaskScheduledForDate(t, dStr)) {
        if (i === 0) continue; 
        break;
      }
      const log = taskLogs.find(l => l.date === dStr);
      if (log?.status === 'done' || log?.status === 'partial') streak++;
      else if (i === 0) continue;
      else break;
    }
    return streak;
  };

  const todayTasks = useMemo(() => {
    return templates
      .filter(t => isTaskScheduledForDate(t, todayStr))
      .map(t => {
        const log = logs.find(l => l.taskId === t.id && l.date === todayStr);
        return {
          ...t,
          status: (log?.status || 'todo') as TaskStatus,
          justification: log?.justification,
          streak: calculateStreak(t.id)
        } as Task;
      });
  }, [templates, logs, todayStr]);

  const updateStatus = async (taskId: string, targetStatus: TaskStatus, justification?: string) => {
    if (!user) return;
    const logId = `log_${taskId}_${todayStr}`;
    const newEntry: TaskLog = { id: logId, taskId, date: todayStr, status: targetStatus, justification };
    setLogs(prev => {
      const filtered = prev.filter(l => !(l.taskId === taskId && l.date === todayStr));
      if (targetStatus === 'todo') return filtered;
      return [newEntry, ...filtered];
    });
    setIsSyncing(true);
    await db.data.saveEntry(user.id, newEntry);
    setLastSync(Date.now());
    setTimeout(() => setIsSyncing(false), 300);
  };

  const addTemplate = async () => {
    if (!newTemplate.title || !user || !newTemplate.category) return;
    const t: TaskTemplate = {
      id: crypto.randomUUID(),
      title: newTemplate.title!,
      category: newTemplate.category as Category,
      priority: 'média',
      recurrence: (newTemplate.recurrence as RecurrenceType) || 'daily',
      daysOfWeek: newTemplate.daysOfWeek || [],
      startDate: newTemplate.startDate || todayStr,
      active: true,
      period: 'day', // Default value since it's no longer chosen in the simplified flow
      timeDescription: newTemplate.timeDescription || ''
    };
    setTemplates(prev => [t, ...prev]);
    setIsSyncing(true);
    await db.data.saveRoutine(user.id, t);
    setIsAdding(false);
    setNewTemplate({ title: '', category: 'Saúde', recurrence: 'daily', period: 'day', daysOfWeek: [1,2,3,4,5], startDate: todayStr });
    setLastSync(Date.now());
    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteTemplate = async (id: string) => {
    if (!user) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    setIsSyncing(true);
    await db.data.deleteRoutine(user.id, id);
    setTaskToDeleteId(null);
    setLastSync(Date.now());
    setTimeout(() => setIsSyncing(false), 300);
  };

  const toggleDay = (day: number) => {
    const current = newTemplate.daysOfWeek || [];
    if (current.includes(day)) {
      setNewTemplate({ ...newTemplate, daysOfWeek: current.filter(d => d !== day) });
    } else {
      setNewTemplate({ ...newTemplate, daysOfWeek: [...current, day] });
    }
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    setUser(null);
    setIsDataReady(false);
    setTemplates([]);
    setLogs([]);
    setChatHistory([]);
    setActiveTab('today');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isTyping || !user) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    try {
      const reply = await getCoachResponse(chatInput, chatHistory, templates, logs, reflections);
      setChatHistory(prev => [...prev, { role: 'model', text: reply || "Lamento, não consegui obter uma resposta do Coach.", timestamp: Date.now() }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Lamento, tive um problema ao processar a resposta.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isAppLoading) return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      <p className="text-neutral-500 font-bold text-[10px] animate-pulse tracking-[0.3em] uppercase">Routine Pro</p>
    </div>
  );

  if (!user) return <AuthScreen onLogin={(u) => { setUser(u); setIsDataReady(false); }} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} noPressure={noPressure} setNoPressure={setNoPressure} onLogout={handleLogout} user={user}>
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 flex items-center gap-3 transition-all duration-500 z-[100] shadow-2xl ${isSyncing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>
        <HardDrive className="text-emerald-500" size={12} />
        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sincronizado Localmente</span>
      </div>

      {!isDataReady ? (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {activeTab === 'today' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex flex-col gap-2">
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Foco Diário</p>
                <h2 className="text-4xl font-black text-white tracking-tighter leading-none">Olá, {user.name} 👋</h2>
                <div className="flex items-center gap-2 text-neutral-500 font-bold text-xs bg-neutral-900/60 w-fit px-4 py-2 rounded-2xl border border-neutral-800/40 mt-2">
                  <CalendarDays size={14} className="text-emerald-500" />
                  <span className="capitalize">{formattedToday}</span>
                </div>
              </header>
              <div className="space-y-4">
                {todayTasks.length > 0 ? todayTasks.map(t => <TaskCard key={t.id} task={t} onUpdateStatus={updateStatus} />) : (
                  <div className="py-24 text-center border-2 border-dashed border-neutral-900 rounded-[40px] bg-neutral-900/10">
                    <Sparkles size={48} className="mx-auto text-neutral-800 mb-6" />
                    <p className="text-neutral-500 font-bold mb-6">Nada agendado para hoje.</p>
                    <button onClick={() => setActiveTab('routine')} className="bg-emerald-500 text-black px-8 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest">Ver o Plano Completo</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'routine' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
              <header className="flex flex-col gap-2">
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Categorias e Hábitos</p>
                <h2 className="text-4xl font-black text-white tracking-tighter leading-none">O Teu Plano</h2>
              </header>

              {templates.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-neutral-900 rounded-[40px] bg-neutral-900/5">
                  <Edit3 size={48} className="mx-auto text-neutral-800 mb-6" />
                  <p className="text-neutral-500 font-bold mb-8">O teu plano começa com uma pequena ação.</p>
                  <button onClick={() => setIsAdding(true)} className="bg-emerald-500 text-black px-8 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest">Criar primeira tarefa</button>
                </div>
              ) : (
                <div className="space-y-12">
                  {CATEGORIES.map(categoryName => {
                    const categoryTasks = templates.filter(t => t.category === categoryName);
                    if (categoryTasks.length === 0) return null;
                    const config = CATEGORY_CONFIG[categoryName];
                    const Icon = config.icon;
                    return (
                      <section key={categoryName} className="space-y-6">
                        <div className="flex items-center gap-3 ml-2">
                          <div className={`p-2 rounded-xl ${config.color} ${config.bg}`}><Icon size={18} /></div>
                          <h3 className="text-xl font-black text-neutral-300 tracking-tight capitalize">{categoryName}</h3>
                          <div className="h-px bg-neutral-900 flex-1 ml-2" />
                        </div>
                        <div className="grid gap-4">
                          {categoryTasks.map(t => {
                            const streak = calculateStreak(t.id);
                            return (
                              <div key={t.id} className="group bg-neutral-900/40 border border-neutral-800 p-6 rounded-[32px] hover:bg-neutral-900/60 transition-all hover:border-neutral-700">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-1 ${config.bg} text-[9px] font-black uppercase tracking-widest ${config.color} rounded-lg`}>{t.category}</span>
                                      <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-1">
                                        {t.recurrence === 'daily' && 'Diário'}
                                        {t.recurrence === 'weekly' && `Semanal (${t.daysOfWeek?.length} dias)`}
                                        {t.recurrence === 'specific' && `Data (${t.startDate})`}
                                      </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white tracking-tight">{t.title}</h4>
                                    {streak > 0 && (
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 w-fit rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <Flame size={12} className="fill-emerald-400" /> {streak} dias
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => setTaskToDeleteId(t.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-black transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setIsAdding(true)} className="fixed bottom-32 right-8 bg-emerald-500 text-black p-6 rounded-[32px] shadow-2xl active:scale-90 transition-transform z-40 hover:rotate-6 group">
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>
          )}

          {activeTab === 'coach' && (
            <div className="flex flex-col h-[calc(100vh-18rem)] space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-6"><Bot size={40} /></div>
                    <p className="text-white text-lg font-black tracking-tight mb-2">Coach Routine Pro</p>
                    <p className="text-neutral-500 text-sm px-16 italic">Análise de consistência local.</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-5 rounded-[28px] text-sm shadow-lg ${msg.role === 'user' ? 'bg-emerald-500 text-black font-semibold' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'}`}>{msg.text}</div>
                  </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-neutral-900 border border-neutral-800 p-5 rounded-[28px] flex items-center gap-2"><div className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:0.2s]" /></div></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="relative pt-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} placeholder="Dúvidas sobre o teu plano? Pergunta aqui..." className="w-full bg-neutral-900 border border-neutral-800 rounded-[32px] py-6 pl-8 pr-16 text-white text-base outline-none focus:ring-1 focus:ring-emerald-500/50" />
                <button onClick={sendChatMessage} disabled={!chatInput.trim() || isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 text-black rounded-2xl disabled:opacity-50"><Send size={22} strokeWidth={3} /></button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <h2 className="text-3xl font-black text-white tracking-tight">O Teu Espaço</h2>
              <div className="p-8 bg-neutral-900/30 border border-neutral-800 rounded-[40px] space-y-8 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl"><ShieldCheck size={24} className="text-emerald-500" /></div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Dados Protegidos</h4>
                    <p className="text-white text-sm font-bold">Armazenamento Local Ativo</p>
                  </div>
                </div>
                <div className="grid gap-6">
                  <div className="flex justify-between items-center pb-4 border-b border-neutral-800/50 text-[9px] font-black uppercase tracking-widest text-neutral-500">Utilizador <span className="text-white text-xs">{user.name}</span></div>
                  <div className="flex justify-between items-center pb-4 border-b border-neutral-800/50 text-[9px] font-black uppercase tracking-widest text-neutral-500">Registos Totais <span className="text-white text-xs">{templates.length + logs.length}</span></div>
                </div>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
              <div className="bg-neutral-900 border border-neutral-800 rounded-[48px] p-8 w-full max-w-md my-auto space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-3xl font-black text-white tracking-tighter text-center">Planear Atividade</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest ml-4">O que vais fazer?</label>
                    <input autoFocus placeholder="Ex: Corrida matinal" className="w-full bg-black border border-neutral-800 rounded-3xl p-5 font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest ml-4">Categoria (Obrigatório)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(c => {
                        const config = CATEGORY_CONFIG[c];
                        const CIcon = config.icon;
                        const isSelected = newTemplate.category === c;
                        return (
                          <button 
                            key={c} 
                            onClick={() => setNewTemplate({...newTemplate, category: c})} 
                            className={`flex items-center gap-3 p-4 rounded-3xl border transition-all ${isSelected ? `bg-white border-white text-black shadow-lg` : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
                          >
                            <CIcon size={18} className={isSelected ? 'text-black' : config.color} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{c}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest ml-4">Frequência</label>
                    <div className="flex gap-2">
                      <button onClick={() => setNewTemplate({...newTemplate, recurrence: 'daily'})} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all ${newTemplate.recurrence === 'daily' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>Diário</button>
                      <button onClick={() => setNewTemplate({...newTemplate, recurrence: 'weekly'})} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all ${newTemplate.recurrence === 'weekly' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>Semanal</button>
                      <button onClick={() => setNewTemplate({...newTemplate, recurrence: 'specific'})} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all ${newTemplate.recurrence === 'specific' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>Única</button>
                    </div>
                  </div>

                  {newTemplate.recurrence === 'weekly' && (
                    <div className="flex justify-between gap-1 animate-in slide-in-from-top-2">
                      {WEEKDAYS.map(day => (
                        <button key={day.val} onClick={() => toggleDay(day.val)} className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${newTemplate.daysOfWeek?.includes(day.val) ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-500'}`}>{day.label}</button>
                      ))}
                    </div>
                  )}

                  {newTemplate.recurrence === 'specific' && (
                    <div className="relative animate-in slide-in-from-top-2">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                      <input type="date" className="w-full bg-black border border-neutral-800 rounded-3xl p-5 pl-12 font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" value={newTemplate.startDate} onChange={e => setNewTemplate({...newTemplate, startDate: e.target.value})} />
                    </div>
                  )}

                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={addTemplate} 
                      disabled={!newTemplate.title || !newTemplate.category}
                      className="w-full bg-emerald-500 text-black py-5 rounded-[28px] font-black text-lg shadow-xl shadow-emerald-500/10 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                      Confirmar no Plano
                    </button>
                    <button onClick={() => setIsAdding(false)} className="w-full text-neutral-500 font-black text-[10px] uppercase tracking-widest py-2">Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {taskToDeleteId && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[70] flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-neutral-900 border border-neutral-800 rounded-[48px] p-10 w-full max-w-sm space-y-8 shadow-2xl animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-2"><AlertTriangle size={32} /></div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Remover do Plano?</h3>
                  <p className="text-neutral-500 text-sm font-medium leading-relaxed">Esta tarefa e o seu histórico imediato serão eliminados deste dispositivo.</p>
                </div>
                <div className="pt-4 space-y-3">
                  <button onClick={() => deleteTemplate(taskToDeleteId)} className="w-full bg-rose-500 text-black py-5 rounded-[28px] font-black text-lg active:scale-95 shadow-lg shadow-rose-500/20">Eliminar</button>
                  <button onClick={() => setTaskToDeleteId(null)} className="w-full text-neutral-500 font-black text-[10px] uppercase tracking-widest py-2">Manter</button>
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
