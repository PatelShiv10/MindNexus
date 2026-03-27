import GlassCard from '../../components/ui/GlassCard';
import { Key } from 'lucide-react';

export default function SettingsApiKeys() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
        API Keys
      </h1>
      <GlassCard className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-neon-purple" />
          </div>
          <div>
            <h3 className="font-medium text-slate-700 dark:text-slate-200">Developer Access</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your secret keys for external automation.</p>
          </div>
        </div>
        
        <div className="p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-black/20 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">You currently have no active API keys.</p>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg text-sm font-medium hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
            Generate New Key
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
