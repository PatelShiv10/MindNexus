import { useState } from 'react';
import { Send, Bot, User, MoreHorizontal, RotateCcw, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { clsx } from 'clsx';

export default function NeuralChatWidget({ isCollapsed, onToggleFocus, isFocused }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: 'Neural interface active. How can I augment your thinking today?' },
    { id: 2, role: 'user', content: 'Analyze the latest quantum mechanics paper I uploaded.' },
    { id: 3, role: 'ai', content: 'Processing "Quantum_Mechanics.pdf"... The paper discusses entanglement entropy in many-body systems. Would you like a summary of the key findings?' },
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, { id: Date.now(), role: 'user', content: input }]);
    setInput('');
    
    // Simulate AI typing
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: 'I am processing that request...' }]);
    }, 1000);
  };

  const clearContext = () => {
    console.log("Context Cleared");
    setMessages([{ id: Date.now(), role: 'ai', content: 'Context reset. Ready for new input.' }]);
  };

  if (isCollapsed) {
    return (
      <div 
        className="h-full flex flex-col items-center pt-4 bg-transparent border-r border-white/5 transition-all duration-300"
      >
        <button
          onClick={onToggleFocus}
          title="Expand Neural Chat"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 bg-transparent hover:text-emerald-400 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all duration-300 group"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <div className="mt-2 w-1 h-1 bg-emerald-400 rounded-full opacity-50 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
      </div>
    );
  }

  return (
    <GlassCard className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Bot className="w-4 h-4 text-neon-purple" />
          Cortex Uplink
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearContext}
            className="text-slate-400 hover:text-neon-blue dark:hover:text-neon-blue transition-colors"
            title="Reset Context"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={onToggleFocus}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {isFocused ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={clsx(
              "flex gap-3 max-w-[90%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'ai' ? "bg-neon-purple/10 text-neon-purple" : "bg-neon-blue/10 text-neon-blue"
            )}>
              {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            
            <div className={clsx(
              "p-3 rounded-2xl text-sm",
              msg.role === 'ai' 
                ? "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-tl-none" 
                : "bg-gradient-to-br from-neon-blue to-neon-purple text-white rounded-tr-none shadow-lg shadow-neon-blue/20"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          placeholder="Transmit query to cortex..."
          className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-neon-purple transition-colors dark:text-slate-200"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </GlassCard>
  );
}
