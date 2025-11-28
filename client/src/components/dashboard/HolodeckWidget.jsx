import { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Play, Pause, Network, Monitor } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

export default function HolodeckWidget({ isCollapsed, onToggleFocus, isFocused }) {
  const fgRef = useRef();
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Dummy Graph Data
  const data = {
    nodes: [...Array(20).keys()].map(i => ({ id: i, group: Math.floor(Math.random() * 3) })),
    links: [...Array(40).keys()].map(() => ({
      source: Math.floor(Math.random() * 20),
      target: Math.floor(Math.random() * 20)
    }))
  };

  if (isCollapsed) {
    return (
      <div 
        className="h-full flex flex-col items-center pt-4 bg-transparent border-r border-white/5 transition-all duration-300"
      >
        <button
          onClick={onToggleFocus}
          title="Expand Knowledge Graph"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 bg-transparent hover:text-neon-purple hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300 group"
        >
          <Network className="w-5 h-5" />
        </button>
        <div className="mt-2 w-1 h-1 bg-neon-purple rounded-full opacity-50 shadow-[0_0_5px_rgba(139,92,246,0.5)]" />
      </div>
    );
  }

  return (
    <GlassCard className={clsx(
      "h-full flex flex-col relative overflow-hidden p-0 transition-all duration-500",
      isExpanded ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl rounded-none border-0" : ""
    )}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-slate-200 dark:border-white/10">
          Knowledge Topology
        </h3>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button 
          onClick={onToggleFocus}
          className="p-2 bg-white/50 dark:bg-black/50 backdrop-blur rounded-full border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200"
          title={isFocused ? "Minimize Focus" : "Focus Mode"}
        >
          {isFocused ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-white/50 dark:bg-black/50 backdrop-blur rounded-full border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200"
          title={isExpanded ? "Exit Fullscreen" : "Fullscreen Overlay"}
        >
          {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 bg-slate-100 dark:bg-black/40">
        <ForceGraph3D
          ref={fgRef}
          graphData={data}
          nodeLabel="id"
          nodeColor={node => theme === 'dark' 
            ? (node.group === 0 ? '#06b6d4' : node.group === 1 ? '#8b5cf6' : '#10b981') 
            : (node.group === 0 ? '#0891b2' : node.group === 1 ? '#7c3aed' : '#059669')
          }
          backgroundColor={theme === 'dark' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)'}
          linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
          width={isExpanded ? window.innerWidth : undefined} // Auto-width in container
          height={isExpanded ? window.innerHeight : undefined} // Auto-height in container
          showNavInfo={false}
        />
      </div>

      {/* HUD Controls */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/20 dark:bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
        <button className="p-2 hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button className="p-2 hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Audio Bar */}
      <div className="h-12 border-t border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur flex items-center px-4 gap-4">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue hover:bg-neon-blue/20 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        {/* Fake Waveform */}
        <div className="flex-1 flex items-center gap-0.5 h-4 opacity-50">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i}
              className="w-1 bg-neon-purple rounded-full transition-all duration-300"
              style={{ 
                height: isPlaying ? `${Math.random() * 100}%` : '20%',
                opacity: Math.random() * 0.5 + 0.5
              }}
            />
          ))}
        </div>
        
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">02:14 / 05:00</span>
      </div>
    </GlassCard>
  );
}
