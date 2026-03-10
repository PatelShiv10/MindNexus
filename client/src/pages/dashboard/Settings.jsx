import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GATEWAY_API } from '../../config/api';
import { User, Cpu, Monitor, Speaker, ShieldAlert, Save, RefreshCw, HardDrive, Download, Trash, BarChart } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import SystemResetModal from '../../components/ui/SystemResetModal';
import SuccessModal from '../../components/ui/SuccessModal';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  
  // Dummy State for Interactivity
  const [creativity, setCreativity] = useState(0.7);
  const [contextWindow, setContextWindow] = useState(true);
  const [particles, setParticles] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isPurging, setIsPurging] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const navigate = useNavigate();

  const handlePurgeClick = () => {
    setIsResetModalOpen(true);
  };

  const confirmPurge = async () => {
    try {
      setIsPurging(true);
      setIsResetModalOpen(false); // Close modal immediately to show loading on button if desired, or keep open. 
      // Let's close it and show loading on the button or a global loader. 
      // Actually, the requirement said "Set button state to 'Purging...'".
      
      const token = localStorage.getItem('token');
      await axios.delete(`${GATEWAY_API}/api/documents/purge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSuccessOpen(true);
    } catch (error) {
      console.error("Purge failed:", error);
      alert("System Reset Failed.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
          System Configuration
        </h1>
        <NexusButton>
          <Save className="w-4 h-4" />
          Save Changes
        </NexusButton>
      </div>

      {/* 1. Neural Profile */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Neural Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your identity and access credentials.</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-slate-800 rounded-full border border-slate-700 text-white hover:bg-neon-blue transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Designation</label>
              <input
                type="text"
                defaultValue={user?.name}
                readOnly
                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Neural ID</label>
              <input
                type="email"
                defaultValue={user?.email}
                readOnly
                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 2. Cortex Calibration */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-neon-purple/10 flex items-center justify-center text-neon-purple">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Cortex Calibration</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Fine-tune AI behavior and cognitive parameters.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Creativity Index (Temperature)</label>
              <span className="text-sm text-neon-purple font-mono">{creativity.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              value={creativity}
              onChange={(e) => setCreativity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-neon-purple"
            />
            <div className="flex justify-between text-xs text-slate-500">
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-200">Context Window</h3>
                <p className="text-xs text-slate-500">Include chat history in prompts</p>
              </div>
              <button 
                onClick={() => setContextWindow(!contextWindow)}
                className={`w-12 h-6 rounded-full transition-colors relative ${contextWindow ? 'bg-neon-purple' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${contextWindow ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 3. Interface Protocols */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Interface Protocols</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Adjust graphics fidelity and visual effects.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Holodeck Quality</label>
            <select className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors dark:text-slate-200">
              <option>Low (Performance)</option>
              <option>Medium (Balanced)</option>
              <option>Ultra (High Fidelity)</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Particle Effects</span>
              <button 
                onClick={() => setParticles(!particles)}
                className={`w-10 h-5 rounded-full transition-colors relative ${particles ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${particles ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Reduced Motion</span>
              <button 
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`w-10 h-5 rounded-full transition-colors relative ${reducedMotion ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${reducedMotion ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 4. Audio Synthesis */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Speaker className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Audio Synthesis</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Configure voice models and speech parameters.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Voice Model</label>
            <select className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-colors dark:text-slate-200">
              <option>Neural - Onyx (Male)</option>
              <option>Neural - Nova (Female)</option>
              <option>Neural - Shimmer (Female)</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Speech Rate</label>
              <span className="text-sm text-amber-500 font-mono">{speechRate}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.25"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* 5. Memory Allocation & Export */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Memory Allocation & Export</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage storage capacity and data portability.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Storage Visualization */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-700 dark:text-slate-200">Neural Capacity</span>
              <span className="text-cyan-500">124 MB / 1 GB Used</span>
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-[12%] bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <BarChart className="w-3 h-3" /> 14 Documents Indexed, 4500 Vectors Stored
            </p>
          </div>

          {/* Data Exfiltration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NexusButton variant="ghost" className="justify-start">
              <Download className="w-4 h-4 mr-2" /> Export Chat Logs
            </NexusButton>
            <NexusButton variant="ghost" className="justify-start">
              <Download className="w-4 h-4 mr-2" /> Export Quiz History
            </NexusButton>
            <NexusButton variant="ghost" className="justify-start">
              <Download className="w-4 h-4 mr-2" /> Backup Knowledge Graph
            </NexusButton>
          </div>

          {/* Cache Control */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div>
              <h3 className="font-medium text-slate-700 dark:text-slate-200">Vector Cache</h3>
              <p className="text-xs text-slate-500">Re-indexing required after clearing. Use only if search results are corrupted.</p>
            </div>
            <NexusButton variant="secondary">
              <Trash className="w-4 h-4 mr-2" /> Clear Cache
            </NexusButton>
          </div>
        </div>
      </GlassCard>

      {/* 6. System Reset */}
      <GlassCard className="p-8 border-red-500/20 dark:border-red-500/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-500">System Reset</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Irreversible actions that affect your neural data.</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-xl bg-red-500/5">
          <div>
            <h3 className="font-medium text-slate-700 dark:text-slate-200">Purge Memory Bank</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Delete all indexed documents and graph nodes.</p>
          </div>
          <NexusButton variant="danger" onClick={handlePurgeClick} disabled={isPurging}>
            {isPurging ? "Purging..." : "Purge All Data"}
          </NexusButton>
        </div>
      </GlassCard>

      <SystemResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmPurge}
      />

      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => {}} // Prevent closing without action if desired, or allow close
        onConfirm={() => { window.location.href = '/nexus'; }}
      />
    </div>
  );
}
