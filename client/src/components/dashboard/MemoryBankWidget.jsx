import { Upload, FileText, CheckCircle, Clock, Maximize2, Minimize2, Database, AlertCircle, Loader2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

export default function MemoryBankWidget({ isCollapsed, onToggleFocus, isFocused, onFileClick, selectedDocId }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:3000/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Smart Polling: Poll every 5s if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/documents/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });
      // Refresh list
      await fetchDocuments();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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
            {documents.length} Files
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
      <div 
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-6 mb-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group bg-slate-50/50 dark:bg-white/5",
          isDragActive ? "border-neon-blue bg-neon-blue/5" : "border-slate-300 dark:border-slate-700 hover:border-neon-blue dark:hover:border-neon-blue"
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-neon-blue animate-spin mb-2" />
            <p className="text-sm font-medium text-neon-blue">Uploading to Neural Core...</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-neon-blue" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {isDragActive ? "Drop to Ingest" : "Drag Neural Data"}
            </p>
            <p className="text-xs text-slate-400">PDF, TXT, MD supported</p>
          </>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {documents.map((doc) => (
          <div 
            key={doc._id} 
            onClick={() => onFileClick && onFileClick(doc._id)}
            className={clsx(
              "relative overflow-hidden flex items-center justify-between p-3 rounded-lg transition-all border cursor-pointer",
              selectedDocId === doc._id 
                ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-transparent hover:border-slate-200 dark:hover:border-white/10"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden z-10">
              <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{doc.title}</p>
                <p className="text-xs text-slate-500">{formatSize(doc.size)}</p>
              </div>
            </div>
            
            {doc.status === 'ready' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 z-10" />
            ) : doc.status === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 z-10" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse z-10" />
            )}
          </div>
        ))}
        
        {documents.length === 0 && !isUploading && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No neural data indexed yet.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
