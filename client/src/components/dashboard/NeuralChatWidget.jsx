import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { GATEWAY_API } from '../../config/api';
import { Send, Bot, User, MoreHorizontal, RotateCcw, MessageSquare, Maximize2, Minimize2, History, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { clsx } from 'clsx';

export default function NeuralChatWidget({ isCollapsed, onToggleFocus, isFocused, messages, setMessages }) {
  const [input, setInput] = useState('');
  // Removed local messages state
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${GATEWAY_API}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${GATEWAY_API}/api/chat`, {
        query: userMsg.content,
        doc_ids: [], // Global search for now
        sessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!sessionId && response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: response.data.answer,
        sources: response.data.sources,
        citation: response.data.citation
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: "System Error: Neural link unstable. Please try again." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearContext = () => {
    setMessages([{ id: Date.now(), role: 'ai', content: 'Context reset. Ready for new input.' }]);
    setSessionId(null);
  };

  const loadSession = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${GATEWAY_API}/api/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowHistory(false);
      setSessionId(id);
      
      // Transform messages to match UI format
      const loadedMessages = response.data.messages.map((msg, index) => ({
        id: msg._id || index,
        role: msg.role,
        content: msg.content,
        sources: msg.sources
      }));
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${GATEWAY_API}/api/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(prev => prev.filter(s => s._id !== id));
      if (sessionId === id) {
        clearContext();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
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
    <GlassCard className="h-full flex flex-col relative overflow-hidden">
      <div className="flex-none p-4 pb-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Bot className="w-4 h-4 text-neon-purple" />
          Cortex Uplink
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={clsx(
              "transition-all duration-300",
              showHistory ? "text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "text-slate-400 hover:text-cyan-400"
            )}
            title="Toggle History"
          >
            <History className="w-4 h-4" />
          </button>
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
    </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 custom-scrollbar relative">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-3"
            >
              {isLoadingHistory ? (
                <div className="text-center text-slate-500 py-4">Loading neural links...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-slate-500 py-4">No previous neural links found.</div>
              ) : (
                sessions.map((session) => (
                  <GlassCard 
                    key={session._id}
                    className="p-3 flex items-center gap-3 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer hover:border-cyan-500/30 group transition-all"
                    onClick={() => loadSession(session._id)}
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {session.title}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                      onClick={(e) => deleteSession(session._id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </GlassCard>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-4"
            >
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
                  
                  <div className="flex flex-col gap-1">
                    <div className={clsx(
                      "p-3 rounded-2xl text-sm",
                      msg.role === 'ai' 
                        ? "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-tl-none" 
                        : "bg-gradient-to-br from-neon-blue to-neon-purple text-white rounded-tr-none shadow-lg shadow-neon-blue/20"
                    )}>
                      {msg.content}
                    </div>
                    
                    {/* Citation badge (exact source + page) */}
                    {msg.citation && (
                      <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">Source</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/10 text-neon-purple border border-neon-purple/20 font-medium">
                          {msg.citation}
                        </span>
                      </div>
                    )}

                    {/* Raw source chips (backward compat) */}
                    {msg.sources && msg.sources.length > 0 && !msg.citation && (
                      <div className="flex flex-wrap gap-2 mt-1 ml-1">
                        {msg.sources.map((source, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/5">
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 max-w-[90%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-neon-purple/10 text-neon-purple">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-slate-100 dark:bg-white/5 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showHistory && (
        <div className="flex-none p-4 pt-0">
          <form onSubmit={handleSend} className="relative">
        <input
          type="text"
          placeholder="Transmit query to cortex..."
          className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-neon-purple transition-colors dark:text-slate-200"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
        />
        <button 
          type="submit"
          disabled={isTyping || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
          </form>
        </div>
      )}
    </GlassCard>
  );
}
