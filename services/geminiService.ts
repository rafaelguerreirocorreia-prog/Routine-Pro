
import { GoogleGenAI, Type } from "@google/genai";
import { TaskTemplate, TaskLog, Reflection, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Função para preparar o contexto do utilizador para a IA
const getContextString = (templates: TaskTemplate[], logs: TaskLog[], reflections: Reflection[]) => {
  const activeTasks = templates.filter(t => t.active && !t.isArchived).map(t => t.title).join(", ");
  const recentLogs = logs.slice(0, 15).map(l => {
    const t = templates.find(temp => temp.id === l.taskId);
    return `${l.date}: ${t?.title || 'Desconhecida'} -> ${l.status}`;
  }).join("; ");
  
  return `
    Contexto do Utilizador:
    - Rotinas Ativas: ${activeTasks}
    - Histórico Recente: ${recentLogs}
    - Reflexões: ${reflections.slice(0, 3).map(r => r.challenges).join(" | ")}
  `;
};

export async function getCoachResponse(
  userInput: string, 
  history: ChatMessage[], 
  templates: TaskTemplate[], 
  logs: TaskLog[], 
  reflections: Reflection[]
) {
  const context = getContextString(templates, logs, reflections);
  
  // Fixed: Map the provided history to Gemini's expected format and pass it to ai.chats.create
  const geminiHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    history: geminiHistory,
    config: {
      systemInstruction: `
        És o Coach Evolutivo da app 'Routine Pro'. 
        O teu objetivo é ajudar o utilizador a manter consistência, não perfeição.
        Usa o contexto fornecido sobre as tarefas e o histórico para dar conselhos personalizados.
        
        Regras:
        1. Sê empático e prático (baseado em psicologia comportamental).
        2. Se o utilizador estiver a falhar muito numa tarefa, sugere reduzi-la ou mudar o horário.
        3. Nunca uses tons de culpa.
        4. Responde sempre em Português de Portugal.
        5. Mantém as respostas curtas e focadas em 1 ou 2 passos acionáveis.
        
        Contexto Atual: ${context}
      `,
    },
  });

  const response = await chat.sendMessage({ 
    message: userInput 
  });
  
  // Fixed: Ensure we return a string, response.text is a getter
  return response.text || '';
}

export async function getRoutineAdjustments(logs: TaskLog[], templates: TaskTemplate[]) {
  const prompt = `Analisa estes logs: ${JSON.stringify(logs.slice(0, 30))}. Identifica tarefas problemáticas e sugere 3 ajustes.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["title", "description"],
            },
          },
          empathyQuote: { type: Type.STRING },
        },
      },
    },
  });
  
  // Fixed: Safely parse JSON from the response text
  const jsonStr = response.text?.trim() || '{}';
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse coach adjustments:", e);
    return { suggestions: [], empathyQuote: "Continua focado, um passo de cada vez." };
  }
}
