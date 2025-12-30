
import React, { useState } from 'react';
import { Check, X, Clock, AlertCircle, Flame } from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task & { streak?: number };
  onUpdateStatus: (id: string, status: TaskStatus, justification?: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus }) => {
  const [showJustify, setShowJustify] = useState(false);
  const [justification, setJustification] = useState(task.justification || '');

  const statusColors = {
    todo: 'border-neutral-800 bg-neutral-900/20 text-neutral-400',
    done: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-[1.01] shadow-lg shadow-emerald-500/5',
    partial: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    missed: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
  };

  return (
    <div className={`p-4 rounded-3xl border transition-all duration-300 ${statusColors[task.status]} mb-4 group`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase bg-neutral-800 px-2 py-0.5 rounded-lg text-neutral-500 group-hover:text-neutral-300 transition-colors">
              {task.category}
            </span>
            {task.streak && task.streak > 1 && (
              <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 animate-pulse">
                <Flame size={10} fill="currentColor" /> {task.streak} DIAS
              </span>
            )}
          </div>
          <h3 className={`text-base font-bold leading-tight ${task.status === 'done' ? 'line-through opacity-40' : 'text-neutral-100'}`}>
            {task.title}
          </h3>
          {task.time && (
            <div className="flex items-center gap-1 text-[10px] font-medium opacity-60">
              <Clock size={12} /> {task.time}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <StatusButton active={task.status === 'done'} onClick={() => onUpdateStatus(task.id, 'done')} color="emerald" icon={<Check size={18} />} />
          <StatusButton active={task.status === 'partial'} onClick={() => onUpdateStatus(task.id, 'partial')} color="amber" icon={<AlertCircle size={18} />} />
          <StatusButton 
            active={task.status === 'missed'} 
            onClick={() => {
              if (task.status === 'missed') {
                onUpdateStatus(task.id, 'todo');
                setShowJustify(false);
              } else {
                onUpdateStatus(task.id, 'missed');
                setShowJustify(true);
              }
            }} 
            color="rose" 
            icon={<X size={18} />} 
          />
        </div>
      </div>

      {showJustify && task.status === 'missed' && (
        <div className="mt-4 pt-4 border-t border-neutral-800 animate-in slide-in-from-top-2">
          <textarea 
            autoFocus
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="O que aconteceu hoje? Sê honesto contigo..."
            className="w-full bg-black/40 border border-neutral-800 rounded-2xl p-3 text-xs focus:ring-1 focus:ring-rose-500 outline-none h-24 placeholder:text-neutral-600"
          />
          <button 
            onClick={() => { onUpdateStatus(task.id, 'missed', justification); setShowJustify(false); }}
            className="mt-2 w-full text-xs bg-rose-500 text-black font-black py-2 rounded-xl transition-all active:scale-95"
          >
            Registar Feedback
          </button>
        </div>
      )}
    </div>
  );
};

const StatusButton = ({ active, onClick, color, icon }: any) => {
  const colors: any = {
    emerald: active ? 'bg-emerald-500 text-black' : 'bg-neutral-800/50 text-neutral-500 hover:text-emerald-400',
    amber: active ? 'bg-amber-500 text-black' : 'bg-neutral-800/50 text-neutral-500 hover:text-amber-400',
    rose: active ? 'bg-rose-500 text-black' : 'bg-neutral-800/50 text-neutral-500 hover:text-rose-400',
  };
  return (
    <button onClick={onClick} className={`p-2.5 rounded-2xl transition-all duration-300 ${colors[color]} ${active ? 'scale-110 shadow-lg' : 'hover:scale-105'}`}>
      {icon}
    </button>
  );
};

export default TaskCard;
