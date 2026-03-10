import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, XCircle, Brain, ChevronLeft, FileBarChart, 
  Loader2, AlertTriangle, Award
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import axios from 'axios';

export default function ExamReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/training/exam/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(res.data);
    } catch (err) {
      console.error("Failed to fetch exam report:", err);
      setError("Failed to load exam report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-nexus-dark text-slate-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-neon-blue" />
        <p className="animate-pulse">Analyzing Neural Performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-nexus-dark text-slate-500 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Report Unavailable</h2>
        <p className="mb-6">{error}</p>
        <NexusButton onClick={() => navigate('/nexus/training')}>
          Return to Training Hub
        </NexusButton>
      </div>
    );
  }

  if (!session) return null;

  const totalMarks = session.total_marks || 1; // Prevent division by zero
  const score = session.score || 0;
  const percentage = Math.round((score / totalMarks) * 100);
  
  let scoreColor = "text-green-500";
  let scoreBorder = "stroke-green-500";
  if (percentage < 70) { scoreColor = "text-yellow-500"; scoreBorder = "stroke-yellow-500"; }
  if (percentage < 40) { scoreColor = "text-red-500"; scoreBorder = "stroke-red-500"; }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark p-6 md:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NexusButton variant="ghost" className="text-xs h-8 px-2" onClick={() => navigate('/nexus/training')}>
              <ChevronLeft className="w-3 h-3 mr-1" /> Back to Training
            </NexusButton>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-neon-blue" />
              Neural Assessment Complete
            </h1>
          </div>
        </div>

        {/* Top Section: Score & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card */}
          <GlassCard className="col-span-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
              {/* Circular Progress SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%" cy="50%" r="70"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-200 dark:text-slate-800"
                />
                <circle
                  cx="50%" cy="50%" r="70"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * percentage) / 100}
                  strokeLinecap="round"
                  className={`${scoreColor} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor}`}>{percentage}%</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Proficiency</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Score: <span className="font-bold text-slate-800 dark:text-white">{score}</span> / {totalMarks}
              </p>
            </div>
          </GlassCard>

          {/* AI Insight Card */}
          <GlassCard className="col-span-1 md:col-span-2 p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-neon-purple/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neon-purple/10 rounded-lg">
                <img src="/logo.png" alt="Cortex" className="w-8 h-8 object-contain" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cortex Analysis</h3>
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{session.feedback || "No feedback generated. Continue training to improve your neural patterns."}"
              </p>
            </div>

            {percentage > 90 && (
              <div className="mt-6 flex items-center gap-2 text-sm text-green-500 font-medium">
                <Award className="w-4 h-4" />
                Outstanding Performance! Neural pathways are optimized.
              </div>
            )}
          </GlassCard>
        </div>

        {/* Detailed Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2">Detailed Review</h3>
          
          {session.questions && session.questions.length > 0 ? (
            session.questions.map((q, idx) => {
              // Determine correctness from backend data
              const isCorrect = q.is_correct;
              const marksAwarded = q.marks_awarded !== undefined ? q.marks_awarded : (isCorrect ? q.marks : 0);

              const isDescriptive = q.type === 'Descriptive';
              const borderColor = isDescriptive 
                ? "border-slate-200 dark:border-slate-700" 
                : isCorrect ? "border-green-500/50" : "border-red-500/50";
              
              const bgColor = isDescriptive
                ? "bg-white dark:bg-slate-900/50"
                : isCorrect ? "bg-green-50/50 dark:bg-green-900/10" : "bg-red-50/50 dark:bg-red-900/10";

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border ${borderColor} ${bgColor} p-6 transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 shrink-0">
                      {isDescriptive ? (
                        <FileBarChart className="w-5 h-5 text-slate-400" />
                      ) : isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200">
                          Question {idx + 1}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {marksAwarded} / {q.marks} Marks
                        </span>
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {q.question}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                        <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                          <span className="block text-xs font-bold opacity-70 mb-1">Your Answer</span>
                          {Array.isArray(q.user_answer) ? q.user_answer.join(", ") : (q.user_answer || "Not Answered")}
                        </div>
                        
                        {!isDescriptive && !isCorrect && (
                          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <span className="block text-xs font-bold opacity-70 mb-1">Correct Answer</span>
                            {Array.isArray(q.correct_answer) ? q.correct_answer.join(", ") : q.correct_answer}
                          </div>
                        )}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-2 text-xs text-slate-500 italic">
                          <span className="font-semibold">Explanation:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-500">
              No questions found for this exam.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
