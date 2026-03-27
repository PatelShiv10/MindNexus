import GlassCard from '../../components/ui/GlassCard';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function SettingsPreferences() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
        Preferences
      </h1>
      <GlassCard className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700 dark:text-slate-200">Interface Theme</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Toggle between Light and Dark mode for the dashboard.</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="pt-6 border-t border-slate-200 dark:border-white/10">
            <h3 className="font-medium text-slate-700 dark:text-slate-200">Notifications</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Manage how MindNexus communicates with you.</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-neon-blue focus:ring-neon-blue w-4 h-4 cursor-pointer" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Email alerts for Podcast Generation</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-neon-blue focus:ring-neon-blue w-4 h-4 cursor-pointer" />
                <span className="text-sm text-slate-600 dark:text-slate-300">Weekly Knowledge Extraction Report</span>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
