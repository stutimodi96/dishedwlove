import React, { useState, useEffect } from 'react';
import { User, db, collection, addDoc, query, where, onSnapshot, Timestamp } from '../firebase';
import { MarketingLog } from '../types';
import { MessageSquare, Instagram, Lightbulb, Send, Copy, Check } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

import { cn } from '../lib/utils';
import VoiceInput from './VoiceInput';

export default function Marketing({ user }: { user: User }) {
  const [logs, setLogs] = useState<MarketingLog[]>([]);
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'whatsapp' | 'instagram' | 'strategy'>('whatsapp');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'marketing_logs'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketingLog));
      setLogs(data.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleGenerate = async () => {
    if (!details) return;
    setLoading(true);
    try {
      let content = '';
      if (activeMode === 'strategy') {
        content = await geminiService.generateGrowthStrategy(details);
      } else {
        content = await geminiService.generateMarketingCopy(activeMode, details);
      }
      setResult(content);
      
      // Log to history
      await addDoc(collection(db, 'marketing_logs'), {
        type: activeMode,
        content,
        timestamp: Timestamp.now(),
        uid: user.uid
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modes = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'strategy', label: 'Strategy', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="serif text-4xl font-bold italic">Marketing Pro</h1>
        <p className="text-ink/60">Grow your bakery with AI-powered content and strategies.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="card p-8 space-y-8">
            <div className="flex p-1 bg-cream rounded-2xl">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveMode(mode.id as any);
                    setResult('');
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-medium text-sm",
                    activeMode === mode.id ? "bg-white shadow-sm text-olive" : "text-ink/40 hover:text-ink/60"
                  )}
                >
                  <mode.icon size={18} />
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  {activeMode === 'strategy' ? 'Current Business Situation' : 'What are you promoting?'}
                </label>
                <VoiceInput onTranscript={(text) => setDetails(prev => prev + (prev ? ' ' : '') + text)} />
              </div>
              <textarea 
                className="input-field min-h-[150px] resize-none"
                placeholder={activeMode === 'strategy' ? "e.g. Sales are slow on weekdays, want to target office workers..." : "e.g. New batch of Korean Cheese Buns available this Sunday, ₹150 each..."}
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
              <button 
                onClick={handleGenerate}
                disabled={loading || !details}
                className="btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Generating...' : (
                  <>
                    Generate {activeMode === 'strategy' ? 'Strategy' : 'Post'}
                    <Send size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="card p-8 space-y-6 border-2 border-olive/10 animate-in fade-in slide-in-from-left-4">
              <div className="flex items-center justify-between">
                <h3 className="serif text-2xl font-semibold italic text-olive">Generated Content</h3>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-cream rounded-full transition-colors text-ink/40 hover:text-olive"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
              <div className="prose prose-olive max-w-none text-ink/80 bg-cream/30 p-6 rounded-3xl border border-ink/5">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="card p-8 space-y-6">
          <h3 className="serif text-2xl font-semibold italic">Marketing History</h3>
          <div className="space-y-6">
            {logs.map((log) => {
              const mode = modes.find(m => m.id === log.type);
              return (
                <div key={log.id} className="space-y-3 pb-6 border-b border-ink/5 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", mode?.bg, mode?.color)}>
                      {mode?.icon && <mode.icon size={12} />}
                      {log.type}
                    </div>
                    <p className="text-[10px] text-ink/40 font-medium">{format(log.timestamp.toDate(), 'MMM d, h:mm a')}</p>
                  </div>
                  <p className="text-sm text-ink/60 line-clamp-3 italic leading-relaxed">
                    {log.content}
                  </p>
                  <button 
                    onClick={() => {
                      setResult(log.content);
                      setActiveMode(log.type);
                    }}
                    className="text-xs text-olive font-semibold hover:underline"
                  >
                    View & Reuse
                  </button>
                </div>
              );
            })}
            {logs.length === 0 && <p className="text-center text-ink/40 py-20 italic">No marketing history yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

