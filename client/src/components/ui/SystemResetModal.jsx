import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';
import NexusButton from './NexusButton';
import { clsx } from 'clsx';

export default function SystemResetModal({ isOpen, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmEnabled = confirmText === 'DELETE';

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmText(''); // Reset for next time
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-500/50 p-8 text-center align-middle shadow-2xl shadow-red-500/10 dark:shadow-[0_0_50px_rgba(239,68,68,0.2)] transition-all">
                
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse" />
                    <AlertOctagon className="w-16 h-16 text-red-500 relative z-10 animate-pulse" />
                  </div>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-xl font-bold leading-6 text-slate-900 dark:text-white mt-4"
                >
                  Critical System Reset
                </Dialog.Title>
                
                <div className="mt-2 mb-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    You are about to wipe the entire Neural Memory Bank. This will permanently delete <strong className="text-red-500">all files, vector embeddings, and graph nodes</strong>.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    This action is irreversible and cannot be undone.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Type "DELETE" to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full text-center border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-red-600 font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="DELETE"
                  />
                </div>

                <div className="flex flex-row gap-4 justify-center">
                  <NexusButton variant="ghost" onClick={onClose}>
                    Cancel
                  </NexusButton>
                  <NexusButton 
                    variant="danger" 
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled}
                    className={clsx(
                      "transition-all duration-300",
                      !isConfirmEnabled && "opacity-50 cursor-not-allowed grayscale"
                    )}
                  >
                    PURGE ALL DATA
                  </NexusButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
