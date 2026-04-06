import React from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'wouter';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#121826] font-sans text-slate-900 dark:text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-100 dark:border-[#2A364A] bg-white dark:bg-[#1E2738] backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {location === '/' ? 'Dashboard Overview' : location.substring(1).replace('-', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <span className="text-xs font-bold">JD</span>
            </div>
          </div>
        </header>
        
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
