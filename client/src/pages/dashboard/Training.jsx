import { useState, useEffect } from 'react';
import { BrainCircuit, Plus, Play, CheckCircle, XCircle, Trophy, FileText, Loader2, BookOpen, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import axios from 'axios';
import confetti from 'canvas-confetti';

// --- Sub-Components ---

const SubjectCard = ({ subject, onStart }) => (
  <GlassCard className="p-6 flex flex-col h-full hover:border-neon-blue/50 transition-colors group">
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">
        <BookOpen className="w-6 h-6" />
      </div>
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
        {subject.documents?.length || 0} Files
      </span>
    </div>
    <h3 className="text-lg font-bold mb-2 truncate">{subject.name}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1 line-clamp-2">
      {subject.description || 'No description provided.'}
    </p>
    <NexusButton onClick={() => onStart(subject)} variant="primary" className="w-full">
      <Play className="w-4 h-4 mr-2" /> Start Drill
    </NexusButton>
  </GlassCard>
);

const CreateSubjectModal = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' | 'simulation'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [patternFiles, setPatternFiles] = useState([]); // For PYQs
  const [knowledgeFiles, setKnowledgeFiles] = useState([]); // For Syllabus
  const [duration, setDuration] = useState(60);
  const [strictMode, setStrictMode] = useState(false);
  const [totalMarks, setTotalMarks] = useState(100);
  const [composition, setComposition] = useState(50); // 50% Objective, 50% Descriptive
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock files
    setFiles([
      { _id: '1', name: 'Neural_Networks_101.pdf' },
      { _id: '2', name: 'Advanced_Cortex_Design.pdf' },
      { _id: '3', name: 'Quantum_Computing_Basics.pdf' },
      { _id: '4', name: 'Cybernetics_History.pdf' },
      { _id: '5', name: 'AI_Ethics_Protocol.pdf' },
      { _id: '6', name: '2024_Midterm_Exam.pdf' },
      { _id: '7', name: '2023_Final_Paper.pdf' },
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (activeTab === 'simulation') {
      // Simulation Logic (Mock for now)
      setTimeout(() => {
        alert(`Synthesizing Prediction...\nPattern Source: ${patternFiles.length} files\nKnowledge Source: ${knowledgeFiles.length} files\nDuration: ${duration} mins\nStrict Mode: ${strictMode ? 'ON' : 'OFF'}\nMarks: ${totalMarks}\nComposition: ${100 - composition}% Obj / ${composition}% Desc`);
        setLoading(false);
        onClose();
      }, 1500);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/training/subject', {
        name,
        description,
        documents: selectedFiles
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (id, targetSet, setFunction) => {
    setFunction(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const SearchableFileList = ({ files, selected, onToggle, colorClass, activeColorClass }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950/30 overflow-hidden flex flex-col h-60">
        {/* Sticky Search Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-md py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-2 custom-scrollbar flex-1">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 italic">
              No matching documents found.
            </div>
          ) : (
            filteredFiles.map(file => (
              <div 
                key={file._id} 
                onClick={() => onToggle(file._id)}
                className={`p-2 mb-1 rounded-md border cursor-pointer flex items-center justify-between transition-all duration-200 ${
                  selected.includes(file._id) 
                    ? activeColorClass
                    : 'bg-white dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className={`w-3 h-3 shrink-0 ${selected.includes(file._id) ? colorClass : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                {selected.includes(file._id) && (
                  <CheckCircle className={`w-3 h-3 ${colorClass} shrink-0`} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="p-6 pb-0 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
            Initialize New Protocol
          </h2>
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('standard')}
              className={`pb-3 text-sm font-medium uppercase tracking-wider transition-colors relative ${activeTab === 'standard' ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Standard Drill
              {activeTab === 'standard' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 dark:bg-cyan-400" />}
            </button>
            <button 
              onClick={() => setActiveTab('simulation')}
              className={`pb-3 text-sm font-medium uppercase tracking-wider transition-colors relative ${activeTab === 'simulation' ? 'text-purple-500 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Exam Simulation
              {activeTab === 'simulation' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 dark:bg-purple-400" />}
            </button>
          </div>
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900/50">
          <form id="create-protocol-form" onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              
              {activeTab === 'standard' ? (
                // STANDARD DRILL FORM
                <div className="flex flex-col h-full gap-5">
                  <div className="shrink-0 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Subject Name</label>
                      <input 
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Advanced Robotics"
                        className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 rounded-lg p-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
                      <textarea 
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief overview..."
                        className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 rounded-lg p-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none transition-colors resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Link Knowledge Base</label>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <SearchableFileList 
                        files={files}
                        selected={selectedFiles} 
                        onToggle={(id) => toggleFile(id, selectedFiles, setSelectedFiles)} 
                        colorClass="text-cyan-500 dark:text-cyan-400"
                        activeColorClass="bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">{selectedFiles.length} source(s) selected</p>
                  </div>
                </div>
              ) : (
                // EXAM SIMULATION FORM
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section A: Pattern Source */}
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20">
                      <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">
                        A. Ingest Historical Patterns (PYQs)
                      </label>
                      <SearchableFileList 
                        files={files}
                        selected={patternFiles} 
                        onToggle={(id) => toggleFile(id, patternFiles, setPatternFiles)} 
                        colorClass="text-purple-500 dark:text-purple-400"
                        activeColorClass="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 shadow-sm"
                      />
                      <p className="text-xs text-slate-500 mt-2">Upload previous exam papers here. The Cortex will analyze question weightage and phrasing style.</p>
                    </div>

                    {/* Section B: Knowledge Source */}
                    <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-100 dark:border-cyan-500/20">
                      <label className="block text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-3">
                        B. Target Knowledge Base
                      </label>
                      <SearchableFileList 
                        files={files}
                        selected={knowledgeFiles} 
                        onToggle={(id) => toggleFile(id, knowledgeFiles, setKnowledgeFiles)} 
                        colorClass="text-cyan-500 dark:text-cyan-400"
                        activeColorClass="bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-sm"
                      />
                      <p className="text-xs text-slate-500 mt-2">Select lecture notes and textbooks for content generation.</p>
                    </div>
                  </div>

                  {/* Scoring Matrix */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" /> Scoring Matrix
                    </h3>
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Marks</label>
                        <input 
                          type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Composition: {100 - composition}% Obj / {composition}% Desc
                        </label>
                        <input 
                          type="range" min="0" max="100" step="10" value={composition} onChange={(e) => setComposition(e.target.value)}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-2"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Objective Heavy</span>
                          <span>Balanced</span>
                          <span>Descriptive Heavy</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section C: Configuration */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex-1 mr-8">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Exam Duration: {duration} Minutes
                      </label>
                      <input 
                        type="range" min="30" max="180" step="15" value={duration} onChange={(e) => setDuration(e.target.value)}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>30m</span>
                        <span>3h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Strict Mode</span>
                      <button 
                        type="button"
                        onClick={() => setStrictMode(!strictMode)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${strictMode ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${strictMode ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Fixed Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex justify-end gap-3 bg-white dark:bg-slate-900 z-10">
              <NexusButton type="button" onClick={onClose} variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
                Cancel
              </NexusButton>
              <NexusButton 
                type="submit" 
                variant="primary" 
                className={`border-none ${activeTab === 'simulation' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500'}`} 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (activeTab === 'simulation' ? 'Synthesize Prediction' : 'Initialize Protocol')}
              </NexusButton>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const QuizInterface = ({ quiz, onComplete }) => {
  const [answers, setAnswers] = useState({});
  
  const handleOptionSelect = (qIndex, option) => {
    const qType = quiz[qIndex].type;
    if (qType === 'MSQ') {
      const current = answers[qIndex] || [];
      const updated = current.includes(option) 
        ? current.filter(o => o !== option) 
        : [...current, option];
      setAnswers({ ...answers, [qIndex]: updated });
    } else {
      setAnswers({ ...answers, [qIndex]: option });
    }
  };

  const handleTextChange = (qIndex, text) => {
    setAnswers({ ...answers, [qIndex]: text });
  };

  const handleSubmit = () => {
    // Calculate score locally for demo (In real app, send to server)
    let score = 0;
    let total = 0;

    quiz.forEach((q, idx) => {
      if (q.type === 'Descriptive') return; // Skip descriptive for auto-grading
      total++;
      const userAns = answers[idx];
      
      if (q.type === 'MSQ') {
        // Simple array comparison
        const correct = q.answer.sort().join(',');
        const user = (userAns || []).sort().join(',');
        if (correct === user) score++;
      } else {
        if (userAns === q.answer) score++;
      }
    });

    onComplete({ score, total, answers });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {quiz.map((q, idx) => (
        <GlassCard key={idx} className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-1 rounded bg-neon-purple/10 text-neon-purple text-xs font-bold uppercase">
              {q.type}
            </span>
            <h3 className="text-lg font-medium">Question {idx + 1}</h3>
          </div>
          <p className="text-lg mb-6">{q.question}</p>
          
          {q.type === 'Descriptive' ? (
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-neon-blue"
              placeholder="Enter your analysis..."
              onChange={(e) => handleTextChange(idx, e.target.value)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, optIdx) => {
                const isSelected = q.type === 'MSQ' 
                  ? (answers[idx] || []).includes(opt)
                  : answers[idx] === opt;
                
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(idx, opt)}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      isSelected 
                        ? 'bg-neon-blue/10 border-neon-blue text-neon-blue' 
                        : 'bg-slate-50 dark:bg-slate-900/30 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>
      ))}
      
      <div className="fixed bottom-6 right-6 z-20">
        <NexusButton variant="primary" onClick={handleSubmit} className="shadow-lg shadow-neon-blue/20">
          Submit Assessment <CheckCircle className="w-4 h-4 ml-2" />
        </NexusButton>
      </div>
    </div>
  );
};

const ResultsView = ({ results, onReset }) => {
  useEffect(() => {
    if (results.score / results.total > 0.8) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#8b5cf6']
      });
    }
  }, [results]);

  const percentage = Math.round((results.score / results.total) * 100);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(139,92,246,0.5)]"
      >
        <Trophy className="w-16 h-16 text-white" />
      </motion.div>
      
      <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
        Assessment Complete
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Your neural pathways have been strengthened.
      </p>

      <div className="grid grid-cols-2 gap-6 w-full mb-8">
        <GlassCard className="p-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-neon-blue">{percentage}%</span>
          <span className="text-sm text-slate-500">Accuracy</span>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-neon-purple">{results.score}/{results.total}</span>
          <span className="text-sm text-slate-500">Score</span>
        </GlassCard>
      </div>

      <div className="w-full text-left mb-8">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-neon-purple" /> Cortex Evaluation
        </h3>
        <GlassCard className="p-6 bg-neon-purple/5 border-neon-purple/20">
          <p className="text-sm italic text-slate-600 dark:text-slate-300">
            "Descriptive answers have been logged for asynchronous review. Multiple choice performance indicates strong retention of core concepts. Recommended next steps: Increase difficulty to 'Hard' for subsequent drills."
          </p>
        </GlassCard>
      </div>

      <NexusButton onClick={onReset} variant="primary">
        Return to Training Hub
      </NexusButton>
    </div>
  );
};

// --- Main Page Component ---

export default function Training() {
  const [view, setView] = useState('hub'); // hub, quiz, results
  const [subjects, setSubjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/training/subject', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const startDrill = async (subject) => {
    setLoadingQuiz(true);
    setActiveSubject(subject);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3000/api/training/generate', {
        subjectId: subject._id,
        difficulty: 'Medium' // Hardcoded for now, could be a modal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizData(res.data);
      setView('quiz');
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz. Ensure documents are linked.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleQuizComplete = (resultData) => {
    setResults(resultData);
    setView('results');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Neural Training Protocols
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Reinforce knowledge pathways through active recall.
          </p>
        </div>
        {view === 'hub' && (
          <NexusButton variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Protocol
          </NexusButton>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {loadingQuiz && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/50 dark:bg-nexus-dark/50 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 text-neon-blue animate-spin mb-4" />
            <p className="text-lg font-medium animate-pulse">Synthesizing Quiz Matrix...</p>
          </div>
        )}

        {view === 'hub' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.length === 0 ? (
              <div className="col-span-full text-center py-20 text-slate-500">
                <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No training protocols found. Initialize a new subject to begin.</p>
              </div>
            ) : (
              subjects.map(sub => (
                <SubjectCard key={sub._id} subject={sub} onStart={startDrill} />
              ))
            )}
          </div>
        )}

        {view === 'quiz' && quizData && (
          <QuizInterface quiz={quizData} onComplete={handleQuizComplete} />
        )}

        {view === 'results' && results && (
          <ResultsView results={results} onReset={() => setView('hub')} />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSubjectModal 
            onClose={() => setShowCreateModal(false)} 
            onSuccess={fetchSubjects} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
