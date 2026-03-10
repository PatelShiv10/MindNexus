import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid, List, FileText, MoreVertical, 
  Trash2, Activity, Database, RefreshCw, Eye, File, FileCode, Loader2
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import GlassCard from '../../components/ui/GlassCard';
import NexusButton from '../../components/ui/NexusButton';
import { clsx } from 'clsx';
import axios from 'axios';
import { GATEWAY_API } from '../../config/api';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

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
  const t = type ? type.toUpperCase() : 'FILE';
  switch (t) {
    case 'PDF': return <FileText className="w-8 h-8 text-red-400" />;
    case 'DOCX':
    case 'DOC': return <FileText className="w-8 h-8 text-blue-500" />;
    case 'PPTX':
    case 'PPT': return <FileText className="w-8 h-8 text-orange-500" />;
    case 'MD':
    case 'TXT': return <FileCode className="w-8 h-8 text-blue-400" />;
    default: return <File className="w-8 h-8 text-slate-400" />;
  }
};

export default function Archives() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${GATEWAY_API}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sort by createdAt desc
      const sortedDocs = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDocuments(sortedDocs);
      setError(null);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load archives.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (doc) => {
    setFileToDelete(doc);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${GATEWAY_API}/api/documents/${fileToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc._id !== fileToDelete._id));
      setDeleteModalOpen(false);
      setFileToDelete(null);
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete document.");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Helper to format size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Helper to extract extension
  const getFileType = (filename, mimeType) => {
    if (filename) {
      const parts = filename.split('.');
      if (parts.length > 1) return parts.pop().toUpperCase();
    }
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'text/plain') return 'TXT';
    if (mimeType?.includes('word')) return 'DOCX';
    if (mimeType?.includes('presentation')) return 'PPTX';
    return 'FILE';
  };

  // Filter Logic
  const filteredData = documents.filter(item => {
    const type = getFileType(item.title, item.fileType);
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || type === filterType;
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
              <option value="DOCX">DOCX</option>
              <option value="PPTX">PPTX</option>
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
          
          <button 
            onClick={fetchDocuments}
            className="p-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl hover:text-neon-blue transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && documents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <p>{error}</p>
            <button onClick={fetchDocuments} className="mt-4 underline">Try Again</button>
          </div>
        ) : filteredData.length === 0 ? (
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
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10">
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
                          key={item._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors group relative"
                        >
                          <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {item.title}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{getFileType(item.title, item.fileType)}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatSize(item.size)}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(item.createdAt)}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Menu as="div" className="relative inline-block text-left">
                              <Menu.Button className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <MoreVertical className="w-4 h-4" />
                              </Menu.Button>
                              <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                              >
                                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden focus:outline-none z-50">
                                  <div className="py-1">
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={() => navigate('/nexus', { state: { targetDocId: item._id } })}
                                          className={clsx(
                                            active ? 'bg-slate-100 dark:bg-white/5' : '',
                                            'w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer'
                                          )}
                                        >
                                          <Eye className="w-4 h-4" /> View in Graph
                                        </button>
                                      )}
                                    </Menu.Item>
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          className={clsx(
                                            active ? 'bg-slate-100 dark:bg-white/5' : '',
                                            'w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer'
                                          )}
                                        >
                                          <RefreshCw className="w-4 h-4" /> Re-Index
                                        </button>
                                      )}
                                    </Menu.Item>
                                    <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={() => handleDeleteClick(item)}
                                          className={clsx(
                                            active ? 'bg-red-50 dark:bg-red-500/10' : '',
                                            'w-full text-left px-4 py-2.5 text-sm text-red-500 flex items-center gap-2 cursor-pointer'
                                          )}
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                      )}
                                    </Menu.Item>
                                  </div>
                                </Menu.Items>
                              </Transition>
                            </Menu>
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
                      key={item._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <GlassCard className="h-full flex flex-col p-6 hover:border-neon-blue/50 transition-colors group relative">
                        <div className="absolute top-4 right-4">
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Menu.Button>
                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden focus:outline-none z-50">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => navigate('/nexus', { state: { targetDocId: item._id } })}
                                        className={clsx(
                                          active ? 'bg-slate-100 dark:bg-white/5' : '',
                                          'w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer'
                                        )}
                                      >
                                        <Eye className="w-4 h-4" /> View in Graph
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        className={clsx(
                                          active ? 'bg-slate-100 dark:bg-white/5' : '',
                                          'w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer'
                                        )}
                                      >
                                        <RefreshCw className="w-4 h-4" /> Re-Index
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleDeleteClick(item)}
                                        className={clsx(
                                          active ? 'bg-red-50 dark:bg-red-500/10' : '',
                                          'w-full text-left px-4 py-2.5 text-sm text-red-500 flex items-center gap-2 cursor-pointer'
                                        )}
                                      >
                                        <Trash2 className="w-4 h-4" /> Delete
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <FileIcon type={getFileType(item.title, item.fileType)} />
                          </div>
                          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1 line-clamp-1 w-full" title={item.title}>
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatSize(item.size)} • {formatDate(item.createdAt)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                          <StatusBadge status={item.status} />
                          <span className="text-xs font-mono text-slate-400">{getFileType(item.title, item.fileType)}</span>
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
      <DeleteConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        fileName={fileToDelete?.title}
      />
    </div>
  );
}
