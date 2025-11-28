import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid, List, FileText, MoreVertical, 
  Trash2, Activity, Database, RefreshCw, Eye, File, FileCode
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import { clsx } from 'clsx';

// Dummy Data
const INITIAL_DATA = [
  { id: 1, name: 'Quantum_Mechanics.pdf', type: 'PDF', size: '2.4 MB', date: '2023-11-20', status: 'ready' },
  { id: 2, name: 'Project_Alpha_Specs.txt', type: 'TXT', size: '14 KB', date: '2023-11-21', status: 'processing' },
  { id: 3, name: 'Neural_Net_Architecture.md', type: 'MD', size: '45 KB', date: '2023-11-22', status: 'ready' },
  { id: 4, name: 'Meeting_Logs_Q3.docx', type: 'DOCX', size: '1.1 MB', date: '2023-11-23', status: 'ready' },
  { id: 5, name: 'Corrupted_Sector_Data.log', type: 'LOG', size: '890 KB', date: '2023-11-24', status: 'error' },
  { id: 6, name: 'Research_Notes_V2.md', type: 'MD', size: '12 KB', date: '2023-11-25', status: 'ready' },
  { id: 7, name: 'System_Config_Backup.json', type: 'JSON', size: '2 KB', date: '2023-11-26', status: 'ready' },
  { id: 8, name: 'Legacy_Codebase.zip', type: 'ZIP', size: '156 MB', date: '2023-11-26', status: 'processing' },
];

const StatusBadge = ({ status }) => {
  const styles = {
    ready: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    processing: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
    error: "bg-red-500/10 text-red-500 border-red-500/20"
  };

  const labels = {
    ready: "Ready",
    processing: "Processing",
    error: "Error"
  };

  return (
    <span className={clsx(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border",
      styles[status] || styles.ready
    )}>
      {labels[status] || status}
    </span>
  );
};

const FileIcon = ({ type }) => {
  switch (type) {
    case 'PDF': return <FileText className="w-8 h-8 text-red-400" />;
    case 'MD':
    case 'TXT': return <FileCode className="w-8 h-8 text-blue-400" />;
    default: return <File className="w-8 h-8 text-slate-400" />;
  }
};

export default function Archives() {
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeMenu, setActiveMenu] = useState(null);

  // Filter Logic
  const filteredData = INITIAL_DATA.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || item.type === filterType;
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Section (Fixed) */}
      <div className="flex-none p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-neon-blue transition-colors" />
          <input 
            type="text" 
            placeholder="Search Neural Database..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="relative">
            <select 
              className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="PDF">PDF</option>
              <option value="TXT">TXT</option>
              <option value="MD">MD</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="error">Error</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-1.5 rounded-lg transition-colors",
                viewMode === 'grid' ? "bg-slate-100 dark:bg-white/10 text-neon-blue" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-1.5 rounded-lg transition-colors",
                viewMode === 'list' ? "bg-slate-100 dark:bg-white/10 text-neon-blue" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 opacity-50 h-full">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No Data Found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
              The neural archives are empty for this query. Upload new data to populate the knowledge graph.
            </p>
            <NexusButton variant="primary">
              Upload New Data
            </NexusButton>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
                      <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Name</th>
                      <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Type</th>
                      <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Size</th>
                      <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Date</th>
                      <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    <AnimatePresence>
                      {filteredData.map((item, i) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {item.name}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.type}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.size}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.date}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {activeMenu === item.id && (
                              <div className="absolute right-6 top-12 z-50 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                <button className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                                  <Eye className="w-4 h-4" /> View in Graph
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4" /> Re-Index
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
                                <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredData.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <GlassCard className="h-full flex flex-col p-6 hover:border-neon-blue/50 transition-colors group relative">
                        <div className="absolute top-4 right-4">
                          <button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <FileIcon type={item.type} />
                          </div>
                          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1 line-clamp-1 w-full" title={item.name}>
                            {item.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.size} • {item.date}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                          <StatusBadge status={item.status} />
                          <span className="text-xs font-mono text-slate-400">{item.type}</span>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Click outside to close menu handler could go here */}
      {activeMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
      )}
    </div>
  );
}
