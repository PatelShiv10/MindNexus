import { Upload, FileText, CheckCircle, Clock, Maximize2, Minimize2, Database } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export default function MemoryBankWidget({ isCollapsed, onToggleFocus, isFocused }) {
  const [uploadProgress, setUploadProgress] = useState(45);
  
  const files = [
    { name: 'Quantum_Mechanics.pdf', status: 'indexed', size: '2.4 MB' },
    { name: 'Project_Alpha.txt', status: 'processing', size: '14 KB' },
    { name: 'Neural_Networks_101.docx', status: 'indexed', size: '1.1 MB' },
    { name: 'Meeting_Notes_2023.md', status: 'indexed', size: '4 KB' },
  ];

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setUploadProgress(prev => (prev >= 100 ? 0 : prev + 5));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (isCollapsed) {
    return (
      <div 
        className="h-full flex flex-col items-center pt-4 bg-transparent border-r border-white/5 transition-all duration-300"
      >
        <button
          onClick={onToggleFocus}
          title="Expand Archives"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 bg-transparent hover:text-neon-blue hover:bg-neon-blue/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 group"
        >
          <Database className="w-5 h-5" />
        </button>
        <div className="mt-2 w-1 h-1 bg-neon-blue rounded-full opacity-50 shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
      </div>
    );
  }

  return (
    <GlassCard className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-neon-blue" />
          Data Sources
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full">
            {files.length} Files
          </span>
          <button 
            onClick={onToggleFocus}
            className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors text-slate-400"
          >
            {isFocused ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 mb-4 flex flex-col items-center justify-center text-center hover:border-neon-blue dark:hover:border-neon-blue transition-colors cursor-pointer group bg-slate-50/50 dark:bg-white/5">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-neon-blue" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drag Neural Data</p>
        <p className="text-xs text-slate-400">PDF, TXT, MD supported</p>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {files.map((file, i) => (
          <div key={i} className="relative overflow-hidden flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
            <div className="flex items-center gap-3 overflow-hidden z-10">
              <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-500">{file.size}</p>
              </div>
            </div>
            
            {file.status === 'indexed' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 z-10" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse z-10" />
            )}

            {/* Progress Bar */}
            {file.status === 'processing' && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-amber-500/50 transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
