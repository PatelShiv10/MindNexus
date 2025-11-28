import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageSquare, Network, Headphones, ArrowRight, Activity, Github, Twitter, BrainCircuit } from 'lucide-react';
import PublicNavbar from '../../components/public/PublicNavbar';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark text-slate-900 dark:text-slate-100 font-sans selection:bg-neon-blue/30 overflow-x-hidden">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Background Pulse */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-neon-blue/20 to-neon-purple/20 blur-[100px] rounded-full opacity-50 animate-pulse-slow pointer-events-none" />
        
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-xs font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
              </span>
              System Online v1.0
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Augment Your <br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Intellect.
              </span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              The AI Operating System for your knowledge. Chat with documents, visualize connections, and synthesize audio from your personal archives.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
              <Link to="/register">
                <NexusButton variant="primary" className="!text-base !px-8 !py-3 shadow-lg shadow-neon-blue/25">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </NexusButton>
              </Link>
              <NexusButton variant="ghost" className="!text-base !px-8 !py-3">
                Explore Demo
              </NexusButton>
            </div>

            {/* Trusted By section removed */}
          </motion.div>

          {/* 3D CSS Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative perspective-1000 hidden lg:block"
          >
            <div className="relative w-full aspect-[16/10] bg-slate-900/90 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl transform rotate-y-12 rotate-x-6 hover:rotate-y-0 hover:rotate-x-0 transition-all duration-700 ease-out overflow-hidden group">
              {/* Header Strip */}
              <div className="h-8 border-b border-white/5 flex items-center px-4 gap-2 bg-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              </div>
              
              <div className="flex h-full pb-8">
                {/* Sidebar Strip */}
                <div className="w-16 border-r border-white/5 bg-white/5 flex flex-col items-center py-4 gap-4">
                   <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
                   <div className="w-8 h-8 rounded-lg bg-white/5" />
                   <div className="w-8 h-8 rounded-lg bg-white/5" />
                   <div className="w-8 h-8 rounded-lg bg-white/5" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-4 flex gap-4">
                   {/* Graph Area */}
                   <div className="flex-1 bg-slate-950/50 rounded-lg border border-white/5 p-4 space-y-3 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
                      <div className="h-32 w-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg border border-white/5 flex items-center justify-center">
                        <Network className="w-12 h-12 text-cyan-500/30 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-3/4 bg-white/10 rounded" />
                        <div className="h-2 w-1/2 bg-white/10 rounded" />
                        <div className="h-2 w-5/6 bg-white/10 rounded" />
                      </div>
                   </div>

                   {/* Chat Area */}
                   <div className="w-64 bg-slate-950/50 rounded-lg border border-white/5 p-3 flex flex-col gap-3">
                      <div className="self-end w-3/4 p-2 bg-cyan-500/20 rounded-lg rounded-tr-none border border-cyan-500/10">
                        <div className="h-1.5 w-full bg-cyan-200/20 rounded mb-1" />
                        <div className="h-1.5 w-2/3 bg-cyan-200/20 rounded" />
                      </div>
                      <div className="self-start w-5/6 p-2 bg-white/5 rounded-lg rounded-tl-none border border-white/5">
                        <div className="h-1.5 w-full bg-white/20 rounded mb-1" />
                        <div className="h-1.5 w-full bg-white/20 rounded mb-1" />
                        <div className="h-1.5 w-1/2 bg-white/20 rounded" />
                      </div>
                   </div>
                </div>
              </div>
              
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative z-10 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Complete Cognitive Stack</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              A unified suite of tools designed to enhance every stage of the learning and creation process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MessageSquare,
                color: "text-neon-blue",
                bg: "bg-neon-blue/10",
                border: "hover:border-neon-blue/50",
                title: "Cortex Uplink",
                desc: "RAG-powered chat that cites your actual documents. Extract insights instantly."
              },
              {
                icon: Network,
                color: "text-neon-purple",
                bg: "bg-neon-purple/10",
                border: "hover:border-neon-purple/50",
                title: "Knowledge Topology",
                desc: "3D visualization of your concept graph. Navigate your second brain spatially."
              },
              {
                icon: BrainCircuit,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                border: "hover:border-emerald-500/50",
                title: "Neural Training",
                desc: "AI-generated quizzes and exam simulations derived directly from your lecture notes."
              },
              {
                icon: Headphones,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                border: "hover:border-amber-500/50",
                title: "Synapse Audio",
                desc: "Turn dry research papers into engaging podcasts. Learn while on the go."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard className={`p-6 h-full ${feature.border} transition-colors group`}>
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-12 px-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center text-white text-xs">
              M
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">MindNexus</span>
            <span className="text-slate-400 text-sm ml-2">© 2025</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-neon-blue transition-colors"><Github className="w-5 h-5" /></a>
            <a href="#" className="hover:text-neon-blue transition-colors"><Twitter className="w-5 h-5" /></a>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
            <Activity className="w-3 h-3" />
            <span>System Status: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
