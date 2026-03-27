import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import GlassCard from '../../components/ui/GlassCard';
import { User, Lock, Save, Loader2, LogOut, Mail } from 'lucide-react';

export default function SettingsProfile() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = { name };
      if (password) {
        payload.password = password;
        payload.oldPassword = oldPassword;
      }

      const response = await axios.put('/api/auth/profile', payload);
      
      updateUser({ name: response.data.name });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setPassword('');
      setOldPassword('');
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.message || 'Failed to update profile.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
        Profile Settings
      </h1>
      
      <GlassCard className="p-6">
        <form onSubmit={handleUpdate} className="space-y-6">
          {message.text && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Neural ID (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Required if changing password"
                  required={!!password}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Password (Optional)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue/50 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <button
              type="submit"
              disabled={loading || (!name)}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-neon-blue hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-6 py-2.5 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
