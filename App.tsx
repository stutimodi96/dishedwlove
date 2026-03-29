/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from './firebase';
import { LayoutDashboard, BookOpen, Megaphone, Package, Mic, LogOut, ChevronRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import Accounting from './components/Accounting';
import Marketing from './components/Marketing';
import Inventory from './components/Inventory';
import VoiceAssistant from './components/VoiceAssistant';
import { cn } from './lib/utils';

type Tab = 'dashboard' | 'accounting' | 'marketing' | 'inventory';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-olive serif text-3xl font-medium"
        >
          Dished with Love
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cream p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md w-full p-10 text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="serif text-5xl text-olive font-semibold italic">Dished with Love</h1>
            <p className="text-ink/60 font-light tracking-wide">Rashmi Modi's Home Bakery Assistant</p>
          </div>
          <div className="aspect-[3/4] rounded-[40px] overflow-hidden bg-olive/5 border-2 border-olive/10">
             <img 
               src="https://picsum.photos/seed/bakery/600/800" 
               alt="Bakery" 
               className="w-full h-full object-cover opacity-80"
               referrerPolicy="no-referrer"
             />
          </div>
          <button
            onClick={handleLogin}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
          >
            Sign in with Google
            <ChevronRight size={20} />
          </button>
          <p className="text-xs text-ink/40 italic">Exclusively for Veg & Eggless Delights</p>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'accounting', label: 'Accounting', icon: BookOpen },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'inventory', label: 'Inventory', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-ink/5 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <h2 className="serif text-xl text-olive font-bold italic">Dished with Love</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-olive/10 overflow-hidden border border-olive/20">
            <img src={user.photoURL || ''} alt="Profile" referrerPolicy="no-referrer" />
          </div>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-ink/60 hover:text-olive transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 md:hidden bg-cream pt-20 p-6"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as Tab);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                      activeTab === tab.id 
                        ? "bg-olive text-white shadow-lg shadow-olive/20" 
                        : "text-ink/60 hover:bg-olive/5 hover:text-olive"
                    )}
                  >
                    <tab.icon size={24} />
                    <span className="text-lg font-medium tracking-wide">{tab.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-ink/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300 border border-ink/5"
              >
                <LogOut size={24} />
                <span className="text-lg font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white border-r border-ink/5 p-6 flex-col justify-between sticky top-0 h-screen">
        <div className="space-y-10">
          <div className="space-y-1">
            <h2 className="serif text-2xl text-olive font-bold italic leading-tight">Dished with Love</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 font-semibold">Assistant Pro</p>
          </div>
          
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300",
                  activeTab === tab.id 
                    ? "bg-olive text-white shadow-lg shadow-olive/20" 
                    : "text-ink/60 hover:bg-olive/5 hover:text-olive"
                )}
              >
                <tab.icon size={20} />
                <span className="text-sm font-medium tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-ink/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-olive/10 overflow-hidden border border-olive/20">
              <img src={user.photoURL || ''} alt="Profile" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.displayName}</p>
              <p className="text-[10px] text-ink/40 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-ink/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'accounting' && <Accounting user={user} />}
              {activeTab === 'marketing' && <Marketing user={user} />}
              {activeTab === 'inventory' && <Inventory user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink/5 p-2 flex items-center justify-around z-40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              activeTab === tab.id ? "text-olive" : "text-ink/40"
            )}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Voice Assistant Trigger */}
      <button
        onClick={() => setIsVoiceOpen(true)}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 bg-olive text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300 z-50"
      >
        <Mic size={24} className="md:hidden" />
        <Mic size={28} className="hidden md:block" />
      </button>

      <VoiceAssistant 
        isOpen={isVoiceOpen} 
        onClose={() => setIsVoiceOpen(false)} 
        user={user}
      />
    </div>
  );
}
