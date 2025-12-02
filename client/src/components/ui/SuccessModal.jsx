import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle } from 'lucide-react';
import NexusButton from './NexusButton';

export default function SuccessModal({ isOpen, onClose, onConfirm }) {
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-green-500/30 p-8 text-center align-middle shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all">
                
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse" />
                    <CheckCircle className="w-16 h-16 text-green-500 relative z-10 animate-pulse" />
                  </div>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-xl font-bold leading-6 text-slate-900 dark:text-white mt-4"
                >
                  System Purge Successful
                </Dialog.Title>
                
                <div className="mt-2 mb-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    All neural pathways have been cleared. Redirecting to Dashboard...
                  </p>
                </div>

                <div className="flex justify-center">
                  <NexusButton 
                    variant="primary" 
                    onClick={onConfirm}
                  >
                    Reboot System
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
