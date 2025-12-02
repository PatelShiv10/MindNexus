import { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import ForceGraph3D from 'react-force-graph-3d';
import { Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Play, Pause, Network, Monitor, Loader2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';
import * as THREE from 'three';

export default function HolodeckWidget({ isCollapsed, onToggleFocus, isFocused, selectedDocId }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeline, setTimeline] = useState([]);
  const timelineRef = useRef([]); // Ref to access timeline in audio callbacks
  const [activeNodeId, setActiveNodeId] = useState(null); // For glow effect
  const lastFocusedNodeRef = useRef(null);
  const audioRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const graphDataRef = useRef({ nodes: [], links: [] }); // Ref for access in audio callbacks
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchGraphData();
  }, [selectedDocId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isExpanded]);

  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedDocId 
        ? `http://localhost:3000/api/graph?doc_id=${selectedDocId}`
        : 'http://localhost:3000/api/graph';
        
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Assign random vivid colors directly
      const nodes = response.data.nodes.map(node => ({
        ...node,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
      }));
      
      setGraphData({ nodes, links: response.data.links });
      graphDataRef.current = { nodes, links: response.data.links };
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { z: fgRef.current.cameraPosition().z * 0.8 },
        null,
        200
      );
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { z: fgRef.current.cameraPosition().z * 1.2 },
        null,
        200
      );
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    // Case A: Audio is Playing -> Pause
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Case B: Audio is Paused (but exists) -> Play
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Case C: No Audio Yet (First Play) -> Generate
    if (!selectedDocId) {
      showToast("Please select a document first.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/api/documents/podcast', 
        { doc_id: selectedDocId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const url = response.data.audio_url;
      const fetchedTimeline = response.data.timeline || [];
      setAudioUrl(url);
      setTimeline(fetchedTimeline);
      timelineRef.current = fetchedTimeline;

      // Create Audio Object
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          setActiveNodeId(null);
          lastFocusedNodeRef.current = null; // Reset focus tracking
        };
        audioRef.current.ontimeupdate = () => {
          const time = audioRef.current.currentTime;
          setCurrentTime(time);
          
          // Cinematic Sync Logic (Refactored)
          const currentTimeline = timelineRef.current;
          if (currentTimeline.length > 0 && fgRef.current) {
            // Find active cue with 2s buffer
            const activeCue = currentTimeline.find(t => Math.abs(time - t.time) < 2);
            
            if (activeCue && activeCue.nodeId !== lastFocusedNodeRef.current) {
              lastFocusedNodeRef.current = activeCue.nodeId;
              setActiveNodeId(activeCue.nodeId);
              
              // Find node in graph data using REF
              const node = graphDataRef.current.nodes.find(n => n.id.toLowerCase() === activeCue.nodeId.toLowerCase());
              
              if (node) {
                // Rotate camera to focus on node
                const distance = 150;
                const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

                fgRef.current.cameraPosition(
                  { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // New position
                  { x: node.x, y: node.y, z: node.z }, // Look at node
                  3000 // Transition duration (ms) - Slower for cinematic feel
                );
                
                showToast(`Focusing: ${node.id}`, 'info');
              }
            }
          }
        };
        audioRef.current.onloadedmetadata = () => setDuration(audioRef.current.duration);
        audioRef.current.playbackRate = playbackRate; // Apply current speed
      } else {
        audioRef.current.src = url;
        // Update timeline ref if re-using audio object for new doc
        timelineRef.current = fetchedTimeline;
      }

      await audioRef.current.play();
      setIsPlaying(true);

    } catch (error) {
      console.error("Error generating podcast:", error);
      showToast("Failed to generate podcast. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const cycleSpeed = () => {
    const rates = [0.75, 1.0, 1.5, 2.0];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

      {/* Toast Notification - Moved above the player dock */}
      <div className={clsx(
        "absolute bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 transform",
        toast.show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        toast.type === 'error' 
          ? "bg-white/90 border border-red-200 text-red-600 dark:bg-slate-900/90 dark:border-red-500/30 dark:text-red-400"
          : "bg-white/90 border border-slate-200 text-slate-700 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-200"
      )}>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button 
          onClick={onToggleFocus}
          className={clsx(
            "p-2 bg-white/50 dark:bg-black/50 backdrop-blur rounded-full border border-slate-200 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200",
            isExpanded && "hidden"
          )}
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

      <div ref={containerRef} className="flex-1 w-full h-full min-h-[400px] bg-slate-100 dark:bg-black/40 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-purple"></div>
          </div>
        )}
        {!isLoading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none px-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No knowledge graph data found. Upload a document to generate topology.</p>
          </div>
        )}
        {dimensions.width > 0 && (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="id"
            nodeColor={node => node.color || "#ffffff"} // Use random HSL or white
            nodeThreeObject={(node) => {
              if (node.id === activeNodeId) {
                // --- Create the Glowing Effect ---
                const group = new THREE.Group();

                // 1. The Inner Core (Bright Solid Sphere)
                const coreGeometry = new THREE.SphereGeometry(8, 32, 32); // Base size
                const coreMaterial = new THREE.MeshStandardMaterial({
                  color: 0x00FFFF, // Neon Cyan
                  emissive: 0x00FFFF, // Emits its own light
                  emissiveIntensity: 1,
                  roughness: 0.1,
                  metalness: 0.1
                });
                const core = new THREE.Mesh(coreGeometry, coreMaterial);
                group.add(core);

                // 2. The Outer Halo (Transparent Glowing Shell)
                const haloGeometry = new THREE.SphereGeometry(12, 32, 32); // Larger size
                const haloMaterial = new THREE.MeshBasicMaterial({ // Basic material isn't affected by lighting
                  color: 0x00FFFF,
                  transparent: true,
                  opacity: 0.3, // Semi-transparent
                  side: THREE.BackSide // Render inside so it doesn't occlude the core
                });
                const halo = new THREE.Mesh(haloGeometry, haloMaterial);
                group.add(halo);

                return group;
              }
              // For inactive nodes, return false to use the default renderer
              return false;
            }}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            backgroundColor="rgba(0,0,0,0)"
            linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            width={dimensions.width}
            height={dimensions.height}
            showNavInfo={false}
            cooldownTicks={100}
            onEngineStop={() => {}}
            onNodeHover={(node) => document.body.style.cursor = node ? 'pointer' : null}
          />
        )}
      </div>

      {/* Unified Control Dock - Vertical Stack */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 w-full max-w-md pointer-events-none">
        
        {/* Row 1: Graph Controls (Floating Ghost) */}
        <div className="flex items-center gap-2 p-1 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity hover:bg-white/30 dark:hover:bg-black/30">
          <button 
            className="p-1.5 hover:bg-white/40 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 hover:bg-white/40 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 hover:bg-white/40 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-slate-200 transition-colors"
            onClick={fetchGraphData}
            title="Reset Graph"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Audio Player (Glass Capsule) */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-xl shadow-slate-200/20 dark:shadow-slate-900/40 pointer-events-auto">
          {/* Play Button (Glowing Orb) */}
          <button 
            onClick={togglePlayback}
            disabled={isGenerating}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 hover:scale-110 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            )}
          </button>
          
          {/* Time Display */}
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 min-w-[80px] text-center select-none whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Dynamic Waveform & Scrubber */}
          <div className="relative flex items-center gap-0.5 h-8 w-40 group cursor-pointer">
             {/* Invisible Scrubber */}
             <input 
               type="range" 
               min={0} 
               max={duration || 100} 
               value={currentTime} 
               onChange={(e) => {
                 const time = Number(e.target.value);
                 if (audioRef.current) audioRef.current.currentTime = time;
                 setCurrentTime(time);
               }}
               className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
               title="Seek"
             />

            {/* Visual Bars */}
            {[...Array(20)].map((_, i) => {
              const progress = duration ? currentTime / duration : 0;
              const isPlayed = (i / 20) < progress;
              
              return (
                <div 
                  key={i}
                  className={clsx(
                    "flex-1 rounded-full transition-all duration-75",
                    isPlayed 
                      ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" 
                      : "bg-slate-300 dark:bg-slate-700 opacity-50",
                    isPlaying && "animate-pulse"
                  )}
                  style={{ 
                    height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : (isPlayed ? '60%' : '30%'),
                    animationDelay: `${Math.random() * 0.5}s`
                  }}
                />
              );
            })}
          </div>
          
          {/* Speed Control */}
          <div 
            onClick={cycleSpeed}
            className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-600/20 dark:border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-500/10 cursor-pointer transition-colors select-none"
          >
            {playbackRate}x
          </div>
        </div>

        {/* Hidden Audio Element - Removed as we use new Audio() in JS, but keeping ref if needed for other things, though logic uses new Audio() */}
        {/* <audio ref={audioRef} src="" className="hidden" /> */}
      </div>
    </GlassCard>
  );
}
