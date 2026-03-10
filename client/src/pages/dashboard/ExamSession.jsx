import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import SubmitExamModal from '../../components/ui/SubmitExamModal';
import axios from 'axios';
import confetti from 'canvas-confetti';

export default function ExamSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: answer }
  const [flagged, setFlagged] = useState([]); // [questionId]
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [id]);

  useEffect(() => {
    if (timeLeft > 0 && !submitting) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && exam && !submitting) {
      // Auto-submit logic could go here
    }
  }, [timeLeft, submitting, exam]);

  const fetchExam = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/training/exam/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExam(res.data);
      setTimeLeft(res.data.duration_minutes * 60);
      
      // Initialize answers if needed, or load from local storage (optional enhancement)
    } catch (err) {
      console.error("Failed to fetch exam:", err);
      alert("Failed to load exam session.");
      navigate('/nexus/training');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId) 
        : [...prev, questionId]
    );
  };

  const handleSubmitClick = () => {
    setSubmitModalOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitModalOpen(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/api/training/exam/${id}/submit`, {
        answers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Navigate to the new Exam Report page
      navigate(`/nexus/exam-report/${id}`); 
      
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-nexus-dark text-slate-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-neon-blue" />
        <p className="animate-pulse">Loading Neural Protocol...</p>
      </div>
    );
  }

  if (!exam) return null;

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const unansweredCount = exam.questions.length - Object.keys(answers).length;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col"
    >
      {/* Header */}
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg truncate max-w-md text-slate-800 dark:text-white">
            {exam.title}
          </h1>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            {exam.questions.length} Questions
          </span>
        </div>
        
        <div className={`font-mono text-xl font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Question Palette */}
        <div className="w-64 bg-white dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto hidden md:block">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Question Palette</h3>
          <div className="grid grid-cols-4 gap-2">
            {exam.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
              const isFlagged = flagged.includes(q.id);
              const isCurrent = currentQuestionIndex === idx;
              
              let bgClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent";
              if (isCurrent) bgClass = "ring-2 ring-neon-blue bg-neon-blue/10 text-neon-blue border-neon-blue/50";
              else if (isFlagged) bgClass = "bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 border-amber-500";
              else if (isAnswered) bgClass = "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  title={isFlagged ? "Marked for Review" : ""}
                  className={`aspect-square rounded-lg text-sm font-medium flex items-center justify-center transition-all relative ${bgClass}`}
                >
                  {idx + 1}
                  {isFlagged && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" /> Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800" /> Flagged
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" /> Unvisited
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard className="p-8 min-h-[400px] flex flex-col">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className="text-xs font-bold text-neon-purple bg-neon-purple/10 px-2 py-1 rounded uppercase tracking-wider">
                        Question {currentQuestionIndex + 1}
                      </span>
                      <span className="ml-3 text-xs text-slate-400">
                        {currentQuestion.marks} Marks • {currentQuestion.type}
                      </span>
                    </div>
                    <button 
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={`p-2 rounded-full transition-colors ${flagged.includes(currentQuestion.id) ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Question Text */}
                  <h2 className="text-xl md:text-2xl font-medium text-slate-800 dark:text-slate-100 mb-8 leading-relaxed">
                    {currentQuestion.question}
                  </h2>

                  {/* Options / Input */}
                  <div className="flex-1">
                    {currentQuestion.type === 'Descriptive' ? (
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-48 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-neon-blue/50 outline-none resize-none transition-all"
                      />
                    ) : (
                      <div className="space-y-3">
                        {/* Handle True/False options fallback */}
                        {(currentQuestion.type === 'TrueFalse' && (!currentQuestion.options || currentQuestion.options.length === 0) 
                          ? ['True', 'False'] 
                          : currentQuestion.options
                        ).map((option, idx) => {
                          const isSelected = answers[currentQuestion.id] === option; // Assuming single choice for now
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(currentQuestion.id, option)}
                              className={`w-full p-4 rounded-xl text-left border transition-all flex items-center group ${
                                isSelected
                                  ? 'border-neon-blue bg-neon-blue/5 text-neon-blue'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-neon-blue/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-4 transition-colors ${
                                isSelected ? 'border-neon-blue bg-neon-blue text-white' : 'border-slate-300 dark:border-slate-600 group-hover:border-neon-blue/50'
                              }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <span className="text-lg">{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex gap-4">
          <NexusButton
            variant="ghost"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="text-slate-500"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </NexusButton>

          <NexusButton
            variant="ghost"
            onClick={() => toggleFlag(currentQuestion.id)}
            className={`${flagged.includes(currentQuestion.id) ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400'}`}
          >
            <Flag className={`w-4 h-4 mr-2 ${flagged.includes(currentQuestion.id) ? 'fill-current' : ''}`} /> 
            {flagged.includes(currentQuestion.id) ? 'Flagged' : 'Flag'}
          </NexusButton>
        </div>

        {isLastQuestion ? (
          <NexusButton
            variant="primary"
            onClick={handleSubmitClick}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white border-none"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Submit Exam
          </NexusButton>
        ) : (
          <NexusButton
            variant="secondary"
            onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </NexusButton>
        )}
      </div>

      <SubmitExamModal 
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={confirmSubmit}
        unansweredCount={unansweredCount}
        flaggedCount={flagged.length}
        totalQuestions={exam.questions.length}
      />
    </motion.div>
  );
}
