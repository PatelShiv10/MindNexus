import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, Share2, Database, ArrowRight } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Augment Your <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">Intellect</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
            MindNexus is your second brain. A neural interface that organizes your digital life, synthesizes knowledge, and augments your thinking.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <NexusButton className="text-lg px-8 py-4">
                Initialize System <ArrowRight className="w-5 h-5" />
              </NexusButton>
            </Link>
            <Link to="/login">
              <NexusButton variant="ghost" className="text-lg px-8 py-4">
                Access Demo
              </NexusButton>
            </Link>
          </div>
        </motion.div>

        {/* Floating Visual */}
        <div className="mt-20 relative h-[400px] w-full max-w-4xl mx-auto">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-neon-blue/20 to-neon-purple/20 blur-3xl" />
            <Brain className="w-32 h-32 text-neon-blue opacity-80" />
          </motion.div>
          
          {/* Orbiting Elements */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-full h-full border border-slate-200 dark:border-white/5 rounded-full"
              style={{ 
                width: `${(i + 1) * 300}px`, 
                height: `${(i + 1) * 300}px`,
                x: '-50%',
                y: '-50%'
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 30 + (i * 10), repeat: Infinity, ease: "linear" }}
            >
              <div className="w-3 h-3 bg-neon-purple rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#8b5cf6]" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <GlassCard className="p-8 hover:border-neon-blue/50 group">
            <div className="w-12 h-12 rounded-lg bg-neon-blue/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 text-neon-blue" />
            </div>
            <h3 className="text-xl font-bold mb-3">Neural Chat</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Conversational interface connected to your entire knowledge base. Ask anything, get synthesized answers.
            </p>
          </GlassCard>

          <GlassCard className="p-8 hover:border-neon-purple/50 group">
            <div className="w-12 h-12 rounded-lg bg-neon-purple/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6 text-neon-purple" />
            </div>
            <h3 className="text-xl font-bold mb-3">Graph Memory</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Visualize connections between your ideas. A 3D force-directed graph that evolves with your knowledge.
            </p>
          </GlassCard>

          <GlassCard className="p-8 hover:border-emerald-500/50 group">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Share2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Synthesized Audio</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Listen to your documents and summaries. High-fidelity text-to-speech for learning on the go.
            </p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
