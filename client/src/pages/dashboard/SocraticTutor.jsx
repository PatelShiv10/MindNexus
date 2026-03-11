import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import {
  Bot, User, Send, Plus, X, FileText, ChevronDown,
  Trash2, MessageSquare, BrainCircuit, Loader2,
  Lightbulb, Zap, BookOpen, Clock, PanelLeftClose,
  PanelLeft, Check, Youtube
} from 'lucide-react';

import { GATEWAY_API } from '../../config/api';


function timeAgo(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

/* ── Source accordion ─────────────────────────────────────────────────────── */
function SourceRow({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        <ChevronDown className={clsx('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/8 text-[11px] text-slate-500 dark:text-slate-400"
                >
                  <FileText className="w-3 h-3 text-neon-blue shrink-0" />
                  <span className="truncate">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Message bubble ───────────────────────────────────────────────────────── */
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={clsx('flex gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5',
        isUser
          ? 'bg-slate-600 dark:bg-slate-500 text-white'
          : 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20'
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className={clsx('flex flex-col gap-1 max-w-[75%]', isUser && 'items-end')}>
        <div className={clsx(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-tr-sm'
            : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/8 rounded-tl-sm'
        )}>
          {/* Attached doc chips */}
          {isUser && msg.attachedDocs?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {msg.attachedDocs.map(d => (
                <div key={d._id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 text-[11px]">
                  <FileText className="w-3 h-3" />
                  {d.title}
                </div>
              ))}
            </div>
          )}
          {isUser ? msg.content : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed text-slate-700 dark:text-slate-200">
              <ReactMarkdown>
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Citation badge */}
        {!isUser && msg.citation && (
          <div className="flex items-center gap-1.5 mt-0.5 ml-1">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">Source</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/10 text-neon-purple border border-neon-purple/20 font-medium">
              {msg.citation}
            </span>
          </div>
        )}

        {!isUser && <SourceRow sources={msg.sources} />}
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ─────────────────────────────────────────────────────── */
function Typing() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-neon-purple" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 flex items-center gap-1">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce inline-block"
            style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

/* ── PDF picker popup (multi-select) ─────────────────────────────────────── */
function DocPicker({ docs, selectedDocs, onToggle, onClearAll, onClose }) {
  const selIds = new Set(selectedDocs.map(d => d._id));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden z-50"
    >
      {/* header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Study Context
          {selectedDocs.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-neon-blue/10 text-neon-blue text-[10px]">
              {selectedDocs.length} selected
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {selectedDocs.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
          No documents in your vault yet.
        </div>
      ) : (
        <ul className="max-h-56 overflow-y-auto py-1">
          {docs.map(doc => {
            const checked = selIds.has(doc._id);
            return (
              <li key={doc._id}>
                <button
                  onClick={() => onToggle(doc)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors',
                    checked ? 'text-neon-blue' : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    checked ? 'border-neon-blue bg-neon-blue/15' : 'border-slate-300 dark:border-white/20'
                  )}>
                    {checked && <Check className="w-2.5 h-2.5 text-neon-blue" />}
                  </div>
                  <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="truncate flex-1 text-left">{doc.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* footer: Done button */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-white/8">
        <button
          onClick={onClose}
          className="w-full py-1.5 rounded-xl bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-purple/20 text-xs font-medium text-slate-600 dark:text-slate-300 hover:from-neon-blue/20 hover:to-neon-purple/20 transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

/* ── Mode toggle pill ─────────────────────────────────────────────────────── */
function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10">
      {[
        { val: 'socratic', label: 'Socratic', icon: Lightbulb },
        { val: 'direct',   label: 'Direct',   icon: Zap },
      ].map(({ val, label, icon: Icon }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200',
            mode === val
              ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── History sidebar item ─────────────────────────────────────────────────── */
function HistoryItem({ session, isActive, onClick, onDelete }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left group flex items-start gap-2 px-3 py-2.5 rounded-xl transition-all duration-150 border',
        isActive
          ? 'bg-neon-purple/10 dark:bg-neon-purple/15 border-neon-purple/25 text-slate-800 dark:text-slate-200'
          : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent'
      )}
    >
      <MessageSquare className={clsx(
        'w-3.5 h-3.5 shrink-0 mt-0.5',
        isActive ? 'text-neon-purple' : 'text-slate-400 dark:text-slate-600'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.title || 'Untitled session'}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          {timeAgo(session.updatedAt)}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(session._id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400 transition-all shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </button>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function SocraticTutor() {
  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode]               = useState('socratic');
  const [messages, setMessages]       = useState([{
    id: 1, role: 'ai',
    content: "Hey! I'm your AI Tutor. In **Socratic mode** I'll guide you to the answer through questions. Switch to **Direct** when you just need a straight explanation.\n\nTap the ＋ to focus on a specific document from your vault.",
    sources: [], citation: null,
  }]);
  const [input, setInput]             = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [docs, setDocs]                 = useState([]);
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [pickerOpen, setPickerOpen]     = useState(false);

  // YouTube Ingest State
  const [ytOpen, setYtOpen]           = useState(false);
  const [ytUrl, setYtUrl]             = useState('');
  const [ytLoading, setYtLoading]     = useState(false);

  const toggleDoc = (doc) => {
    setAttachedDocs(prev =>
      prev.some(d => d._id === doc._id)
        ? prev.filter(d => d._id !== doc._id)
        : [...prev, doc]
    );
  };
  const [sessions, setSessions]       = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  useEffect(() => {
    axios.get(`${GATEWAY_API}/api/documents`, { headers })
      .then(r => setDocs(r.data || [])).catch(() => {});
  }, []);

  const fetchHistory = useCallback(() => {
    setHistLoading(true);
    return axios.get(`${GATEWAY_API}/api/chat`, { headers })
      .then(r => {
        const data = r.data || [];
        setSessions(data);
        return data;
      })
      .catch(() => [])
      .finally(() => setHistLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { 
    fetchHistory().then(data => {
      if (data && data.length > 0) {
        axios.get(`${GATEWAY_API}/api/chat/${data[0]._id}`, { headers })
          .then(r => {
            setSessionId(data[0]._id);
            setMessages(r.data.messages.map((m, i) => ({
              id: m._id || i, role: m.role, content: m.content,
              sources: m.sources || [], citation: null,
            })));
          }).catch(console.error);
      }
    }); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHistory]);

  useEffect(() => {
    const handler = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSession = async (id) => {
    try {
      const r = await axios.get(`${GATEWAY_API}/api/chat/${id}`, { headers });
      setSessionId(id);
      setMessages(r.data.messages.map((m, i) => ({
        id: m._id || i, role: m.role, content: m.content,
        sources: m.sources || [], citation: null,
      })));
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id) => {
    await axios.delete(`${GATEWAY_API}/api/chat/${id}`, { headers }).catch(() => {});
    setSessions(prev => prev.filter(s => s._id !== id));
    if (sessionId === id) newChat();
  };

  const newChat = () => {
    setSessionId(null);
    setAttachedDocs([]);
    setMessages([{
      id: Date.now(), role: 'ai',
      content: "New session started. What would you like to explore?",
      sources: [], citation: null,
    }]);
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: Date.now(), role: 'user', content: text,
      attachedDocs: [...attachedDocs], sources: [], citation: null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setPickerOpen(false);
    setIsTyping(true);

    const sys = mode === 'socratic'
      ? '[SYSTEM: You are a Socratic tutor. NEVER give the answer directly. Ask probing questions that guide the student step-by-step to discover the answer themselves.]'
      : '[SYSTEM: You are a direct tutor. Give clear, accurate, well-structured answers.]';

    // Format history
    const historyPayload = messages
      .filter(m => !!m.content)
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'human' : 'ai',
        content: m.content
      }));

    try {
      const res = await axios.post(`${GATEWAY_API}/api/chat`, {
        query: text,
        systemPrompt: sys,
        chat_history: historyPayload,
        doc_ids: attachedDocs.map(d => d._id),
        sessionId,
      }, { headers });

      if (!sessionId && res.data.sessionId) {
        setSessionId(res.data.sessionId);
        fetchHistory();
      }
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        content: res.data.answer || 'No response received.',
        sources: res.data.sources || [],
        citation: res.data.citation || null,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        content: 'Connection error. Please try again.',
        sources: [], citation: null,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInput = e => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const handleYouTubeSubmit = async () => {
    const url = ytUrl.trim();
    if (!url) return;

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!ytRegex.test(url)) {
      alert("Please enter a valid YouTube URL.");
      return;
    }

    setYtLoading(true);
    try {
      await axios.post(`${GATEWAY_API}/api/documents/youtube`, { url }, { headers });
      setYtUrl('');
      setYtOpen(false);
      // Refetch documents to include the newly ingested youtube transcript
      axios.get(`${GATEWAY_API}/api/documents`, { headers })
        .then(r => setDocs(r.data || [])).catch(() => {});
    } catch (err) {
      console.error(err);
      alert("Failed to ingest YouTube link");
    } finally {
      setYtLoading(false);
    }
  };

  /* ── render ── */
  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex overflow-hidden border-t border-slate-200 dark:border-white/8 bg-white dark:bg-slate-950">

      {/* ══ HISTORY SIDEBAR ══ */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="shrink-0 flex flex-col border-r border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-slate-900/60 overflow-hidden"
          >
            {/* sidebar header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-neon-purple" />
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">AI Tutor</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* new chat */}
            <div className="p-3 border-b border-slate-200 dark:border-white/8 shrink-0">
              <button
                onClick={newChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-purple/25 text-sm text-slate-700 dark:text-slate-200 hover:from-neon-blue/20 hover:to-neon-purple/20 transition-all font-medium"
              >
                <Plus className="w-4 h-4 text-neon-purple" />
                New Session
              </button>
            </div>

            {/* history list */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
              {histLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 py-8">
                  No past sessions yet.
                </p>
              ) : (
                sessions.map(s => (
                  <HistoryItem
                    key={s._id}
                    session={s}
                    isActive={s._id === sessionId}
                    onClick={() => loadSession(s._id)}
                    onDelete={deleteSession}
                  />
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ══ MAIN CHAT ══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* top bar */}
        <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-slate-200 dark:border-white/8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* context badges */}
          {attachedDocs.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {attachedDocs.map(d => (
                <div key={d._id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-neon-blue/10 border border-neon-blue/25 text-neon-blue">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{d.title}</span>
                  <button
                    onClick={() => toggleDoc(d)}
                    className="ml-0.5 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-600">All documents</span>
          )}

          {/* mode toggle */}
          <div className="ml-auto">
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {isTyping && <Typing />}
          <div ref={bottomRef} />
        </div>

        {/* input bar */}
        <div className="shrink-0 px-4 sm:px-8 pb-5 pt-3 bg-white/60 dark:bg-transparent">
          <form
            onSubmit={send}
            className="relative flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-3 py-2.5 focus-within:border-neon-purple/40 transition-colors shadow-sm"
          >
            {/* + / doc picker */}
            <div ref={pickerRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPickerOpen(o => !o)}
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                  pickerOpen
                    ? 'bg-neon-purple/15 text-neon-purple border border-neon-purple/30'
                    : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-300 dark:border-white/10 hover:text-neon-purple hover:border-neon-purple/30 hover:bg-neon-purple/5'
                )}
                title="Attach document"
              >
                <Plus className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {pickerOpen && (
                  <DocPicker
                    docs={docs}
                    selectedDocs={attachedDocs}
                    onToggle={toggleDoc}
                    onClearAll={() => setAttachedDocs([])}
                    onClose={() => setPickerOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* YouTube expander button */}
            <button
              type="button"
              onClick={() => setYtOpen(!ytOpen)}
              className={clsx(
                'w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200',
                ytOpen
                  ? 'bg-red-500/15 text-red-500 border border-red-500/30'
                  : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-300 dark:border-white/10 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5'
              )}
              title="Add YouTube Link"
            >
              <Youtube className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {ytOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 170, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center shrink-0 overflow-hidden"
                >
                  <div className="flex gap-1 items-center w-[160px] mx-1">
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500/50 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Paste YouTube URL..."
                      value={ytUrl}
                      onChange={e => setYtUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleYouTubeSubmit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={ytLoading}
                      onClick={handleYouTubeSubmit}
                      className="w-7 h-7 shrink-0 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 disabled:opacity-50 transition-colors"
                      title="Submit YouTube link"
                    >
                      {ytLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 relative -translate-x-px" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder={
                mode === 'socratic'
                  ? "Ask me anything — I'll guide you to the answer..."
                  : "Ask anything — I'll answer directly..."
              }
              disabled={isTyping}
              className="flex-1 bg-transparent resize-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: '24px', maxHeight: '140px' }}
            />

            {/* send */}
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-white flex items-center justify-center shadow-md shadow-neon-purple/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isTyping
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-400 dark:text-slate-700 mt-2">
            <kbd className="px-1 bg-slate-200 dark:bg-white/5 rounded text-[9px]">Enter</kbd> send
            &nbsp;·&nbsp;
            <kbd className="px-1 bg-slate-200 dark:bg-white/5 rounded text-[9px]">Shift+Enter</kbd> newline
            &nbsp;·&nbsp;
            Mode:{' '}
            <span className={mode === 'socratic' ? 'text-neon-purple' : 'text-neon-blue'}>
              {mode === 'socratic' ? 'Socratic' : 'Direct'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
