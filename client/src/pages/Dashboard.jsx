import { useState, useEffect } from 'react'
import axios from 'axios'
import { CheckCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../context/AuthContext'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export default function Dashboard() {
  const [status, setStatus] = useState({ gateway: 'Checking...', ai_engine: 'Checking...' })
  const [loading, setLoading] = useState(false)
  const { user, logout } = useAuth()

  const checkSystem = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/system-status')
      setStatus(response.data)
    } catch (error) {
      setStatus({ gateway: 'Offline', ai_engine: 'Offline' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSystem()
  }, [])

  const StatusCard = ({ title, status }) => {
    const isOnline = status === 'Online'
    return (
      <div className={cn(
        "p-6 rounded-xl border transition-all duration-300",
        isOnline 
          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-400" 
          : "bg-red-950/30 border-red-500/50 text-red-400"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {isOnline ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <p className="text-2xl font-bold tracking-wider">{status}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-8 border-b border-slate-800">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              MindNexus
            </h1>
            <p className="text-slate-400 mt-2">Neural Interface System | Operator: {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={checkSystem}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <StatusCard title="Gateway Server" status={status.gateway} />
          <StatusCard title="Cortex Engine" status={status.ai_engine} />
        </div>

        <div className="mt-12 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4 text-slate-300">System Logs</h2>
          <div className="font-mono text-sm text-slate-500 space-y-2">
            <p>&gt; Initializing neural bridge...</p>
            <p>&gt; Connecting to local cortex node...</p>
            <p>&gt; Status check initiated at {new Date().toLocaleTimeString()}</p>
            {status.gateway === 'Online' && <p className="text-emerald-500/70">&gt; Gateway connection established.</p>}
            {status.ai_engine === 'Online' && <p className="text-emerald-500/70">&gt; Cortex engine active and responding.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
