import { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import { GATEWAY_API } from '../../config/api';
import ForceGraph3D from 'react-force-graph-3d';
import { Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Play, Pause, Network, Monitor, Loader2, Download } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Toast from '../ui/Toast';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';
import * as THREE from 'three';

export default function HolodeckWidget({ isCollapsed, onToggleFocus, isFocused, selectedDocId, selectedDocTitle }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState('unknown'); // 'unknown'|'processing'|'ready'|'not_started'
  const pollingRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [notification, setNotification] = useState(null);
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
    if (selectedDocId) {
      fetchGraphData();
      resetPodcastState();
      checkForExistingPodcast();
    } else {
      setGraphData({ nodes: [], links: [] });
      graphDataRef.current = { nodes: [], links: [] };
      resetPodcastState();
    }
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
    if (!selectedDocId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${GATEWAY_API}/api/graph?doc_id=${selectedDocId}`;
        
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

  const resetPodcastState = () => {
    // Stop any active polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // Pause current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsGenerating(false);
    setPodcastStatus('unknown');
    setAudioUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setTimeline([]);
    timelineRef.current = [];
    setActiveNodeId(null);
    lastFocusedNodeRef.current = null;
  };

  // Load a ready podcast into the audio player (without auto-playing)
  const loadPodcast = (url, fetchedTimeline) => {
    setAudioUrl(url);
    setTimeline(fetchedTimeline);
    timelineRef.current = fetchedTimeline;
    setPodcastStatus('ready');
    setIsGenerating(false);

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setActiveNodeId(null);
        lastFocusedNodeRef.current = null;
      };
      audioRef.current.ontimeupdate = () => {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        const currentTimeline = timelineRef.current;
        if (currentTimeline.length > 0 && fgRef.current) {
          const activeCue = currentTimeline.find(t => Math.abs(time - t.time) < 2);
          if (activeCue && activeCue.nodeId !== lastFocusedNodeRef.current) {
            lastFocusedNodeRef.current = activeCue.nodeId;
            setActiveNodeId(activeCue.nodeId);
            const node = graphDataRef.current.nodes.find(n => n.id.toLowerCase() === activeCue.nodeId.toLowerCase());
            if (node) {
              const distance = 150;
              const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
              fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                { x: node.x, y: node.y, z: node.z },
                3000
              );
              showToast(`Focusing: ${node.id}`, 'info');
            }
          }
        }
      };
      audioRef.current.onloadedmetadata = () => setDuration(audioRef.current.duration);
      audioRef.current.playbackRate = playbackRate;
    }
  };

  const checkForExistingPodcast = async () => {
    if (!selectedDocId) return;

    try {
      const token = localStorage.getItem('token');

      // 1. First check status (fast, non-blocking)
      const statusRes = await axios.get(
        `${GATEWAY_API}/api/documents/podcast-status/${selectedDocId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { status } = statusRes.data;
      setPodcastStatus(status);

      if (status === 'ready') {
        // Podcast is cached - fetch the full data
        const podcastRes = await axios.post(
          `${GATEWAY_API}/api/documents/podcast`,
          { doc_id: selectedDocId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (podcastRes.data.audio_url) {
          loadPodcast(podcastRes.data.audio_url, podcastRes.data.timeline || []);
          showToast('Podcast ready — click Play!', 'success');
        }
      } else if (status === 'processing') {
        // Podcast is being generated in background — poll until done
        setIsGenerating(true);
        showToast('Podcast is being prepared...', 'info');
        pollingRef.current = setInterval(async () => {
          try {
            const pollStatus = await axios.get(
              `${GATEWAY_API}/api/documents/podcast-status/${selectedDocId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (pollStatus.data.status === 'ready') {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
              const podcastRes = await axios.post(
                `${GATEWAY_API}/api/documents/podcast`,
                { doc_id: selectedDocId },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (podcastRes.data.audio_url) {
                loadPodcast(podcastRes.data.audio_url, podcastRes.data.timeline || []);
                showToast('Podcast ready — click Play!', 'success');
              }
            }
          } catch (e) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsGenerating(false);
          }
        }, 4000);
      }
      // If 'not_started', do nothing — user will trigger generation on Play
    } catch (error) {
      console.log('Could not check podcast status:', error.message);
    }
  };

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    // Case A: Audio is playing -> Pause
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Case B: Podcast is still being generated in background -> wait
    if (isGenerating || podcastStatus === 'processing') {
      showToast('Podcast is still being prepared, please wait...', 'info');
      return;
    }

    // Case C: Audio is loaded and paused -> resume
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Case D: No document selected
    if (!selectedDocId) {
      showToast('Please select a document first.', 'error');
      return;
    }

    // Case E: First Play - check status then generate if needed
    setIsGenerating(true);
    showToast('Generating podcast...', 'info');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${GATEWAY_API}/api/documents/podcast`,
        { doc_id: selectedDocId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'processing') {
        // Background task is running, start polling
        setPodcastStatus('processing');
        showToast('Podcast is generating in background...', 'info');
        pollingRef.current = setInterval(async () => {
          try {
            const pollStatus = await axios.get(
              `${GATEWAY_API}/api/documents/podcast-status/${selectedDocId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (pollStatus.data.status === 'ready') {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
              const podcastRes = await axios.post(
                `${GATEWAY_API}/api/documents/podcast`,
                { doc_id: selectedDocId },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (podcastRes.data.audio_url) {
                loadPodcast(podcastRes.data.audio_url, podcastRes.data.timeline || []);
                showToast('Podcast ready! Click Play to listen.', 'success');
                setIsGenerating(false);
              }
            }
          } catch (e) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsGenerating(false);
          }
        }, 4000);
        return;
      }

      // Podcast was generated synchronously
      const url = response.data.audio_url;
      const fetchedTimeline = response.data.timeline || [];
      loadPodcast(url, fetchedTimeline);

      await audioRef.current.play();
      setIsPlaying(true);
      showToast('Podcast ready!', 'success');

    } catch (error) {
      console.error('Error generating podcast:', error);
      showToast('Failed to generate podcast. Please try again.', 'error');
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

  const handleDownload = async () => {
    if (!audioUrl) return;
    try {
      showToast('Downloading podcast...', 'info');
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const title = selectedDocTitle ? selectedDocTitle.replace(/\.[^/.]+$/, "") : "document";
      a.download = `${title}_podcast.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Download failed.', 'error');
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
      {/* Toast Notification - Moved above the player dock */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

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
        {!selectedDocId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 text-center bg-white/40 dark:bg-black/40 backdrop-blur-sm">
            <Network className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">Select a file or document to view its Knowledge Graph</p>
          </div>
        )}
        {selectedDocId && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-purple"></div>
          </div>
        )}
        {selectedDocId && !isLoading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none px-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No knowledge graph data found. Upload a document to generate topology.</p>
          </div>
        )}
        {selectedDocId && dimensions.width > 0 && graphData.nodes.length > 0 && (
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
            disabled={isGenerating && !audioUrl}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 hover:scale-110 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isGenerating && !audioUrl ? (
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

          {/* Download Control */}
          <button 
            onClick={handleDownload}
            disabled={!audioUrl}
            className="p-1.5 hover:bg-cyan-500/10 rounded-full text-cyan-600 dark:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Podcast"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Audio Element - Removed as we use new Audio() in JS, but keeping ref if needed for other things, though logic uses new Audio() */}
        {/* <audio ref={audioRef} src="" className="hidden" /> */}
      </div>
    </GlassCard>
  );
}
