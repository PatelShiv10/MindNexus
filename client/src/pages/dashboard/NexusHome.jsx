import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import MemoryBankWidget from '../../components/dashboard/MemoryBankWidget';
import HolodeckWidget from '../../components/dashboard/HolodeckWidget';
import NeuralChatWidget from '../../components/dashboard/NeuralChatWidget';

export default function NexusHome() {
  const [focusMode, setFocusMode] = useState('none'); // 'none' | 'files' | 'graph' | 'chat'
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'ai', content: 'Neural interface active. How can I augment your thinking today?' }
  ]);
  
  const location = useLocation();

  useEffect(() => {
    if (location.state?.targetDocId) {
      setSelectedDocId(location.state.targetDocId);
      setFocusMode('graph'); // Auto-focus the graph view
      // Clear history state so refresh doesn't stick
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const toggleFocus = (mode) => {
    if (focusMode === mode) {
      setFocusMode('none');
    } else {
      setFocusMode(mode);
    }
  };

  const handleFileClick = (docId, docTitle) => {
    if (selectedDocId === docId) {
      setSelectedDocId(null); // Deselect
      setSelectedDocTitle(null);
    } else {
      setSelectedDocId(docId);
      setSelectedDocTitle(docTitle);
    }
  };

  // 1. Define Widgets
  const filesWidget = (
    <motion.div 
      layoutId="files-widget"
      className={clsx(
        "transition-all duration-500 ease-in-out overflow-hidden h-full",
        focusMode === 'none' ? "w-full lg:w-[30%]" : "flex-1"
      )}
    >
      <MemoryBankWidget 
        isCollapsed={focusMode !== 'none' && focusMode !== 'files'}
        onToggleFocus={() => toggleFocus('files')}
        isFocused={focusMode === 'files'}
        onFileClick={handleFileClick}
        selectedDocId={selectedDocId}
      />
    </motion.div>
  );

  const graphWidget = (
    <motion.div 
      layoutId="graph-widget"
      className={clsx(
        "transition-all duration-500 ease-in-out overflow-hidden h-full",
        focusMode === 'none' ? "flex-1" : "flex-1"
      )}
    >
      <HolodeckWidget 
        isCollapsed={focusMode !== 'none' && focusMode !== 'graph'}
        onToggleFocus={() => toggleFocus('graph')}
        isFocused={focusMode === 'graph'}
        selectedDocId={selectedDocId}
        selectedDocTitle={selectedDocTitle}
      />
    </motion.div>
  );

  const chatWidget = (
    <motion.div 
      layoutId="chat-widget"
      className={clsx(
        "transition-all duration-500 ease-in-out overflow-hidden h-full",
        focusMode === 'none' ? "w-full lg:w-[350px]" : "flex-1"
      )}
    >
      <NeuralChatWidget 
        isCollapsed={focusMode !== 'none' && focusMode !== 'chat'}
        onToggleFocus={() => toggleFocus('chat')}
        isFocused={focusMode === 'chat'}
        messages={chatMessages}
        setMessages={setChatMessages}
      />
    </motion.div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden">
      <AnimatePresence mode="popLayout">
        {focusMode === 'none' ? (
          // State A: Default 3-Column Layout
          <motion.div 
            key="default-layout"
            className="flex flex-col lg:flex-row gap-6 h-full overflow-y-auto lg:overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filesWidget}
            {graphWidget}
            {chatWidget}
          </motion.div>
        ) : (
          // State B: Focus Mode (Left Dock + Main Stage)
          <motion.div 
            key="focus-layout"
            className="flex flex-col lg:flex-row gap-6 h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Left Dock */}
            <div className="flex lg:flex-col gap-4 w-full lg:w-[70px] shrink-0 order-2 lg:order-1 h-[70px] lg:h-full">
              {focusMode === 'files' && (
                <>
                  <div className="flex-1 lg:h-1/2">{graphWidget}</div>
                  <div className="flex-1 lg:h-1/2">{chatWidget}</div>
                </>
              )}
              {focusMode === 'graph' && (
                <>
                  <div className="flex-1 lg:h-1/2">{filesWidget}</div>
                  <div className="flex-1 lg:h-1/2">{chatWidget}</div>
                </>
              )}
              {focusMode === 'chat' && (
                <>
                  <div className="flex-1 lg:h-1/2">{filesWidget}</div>
                  <div className="flex-1 lg:h-1/2">{graphWidget}</div>
                </>
              )}
            </div>

            {/* Main Stage */}
            <div className="flex-1 h-full order-1 lg:order-2 min-h-0">
              {focusMode === 'files' && filesWidget}
              {focusMode === 'graph' && graphWidget}
              {focusMode === 'chat' && chatWidget}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
