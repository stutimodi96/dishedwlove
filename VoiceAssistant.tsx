import React, { useState, useEffect, useRef } from 'react';
import { User, db, collection, addDoc, Timestamp } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Send, Sparkles, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

import { cn } from '../lib/utils';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function VoiceAssistant({ isOpen, onClose, user }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const recognitionRef = useRef<any>(null);
  const handleProcessRef = useRef<(text: string) => Promise<void>>(async () => {});

  const handleProcess = async (text: string) => {
    if (!text) return;
    setProcessing(true);
    setStatus('processing');
    setFeedback('Analyzing your request...');

    try {
      const data = await geminiService.processVoiceCommand(text);
      
      if (data.product && data.price && data.quantity) {
        // It's a ledger entry
        await addDoc(collection(db, 'ledger'), {
          ...data,
          total: data.price * data.quantity,
          date: Timestamp.now(),
          uid: user.uid
        });
        setStatus('success');
        setFeedback(`Successfully added: ${data.quantity} ${data.product} for ${data.customer || 'Customer'}.`);
      } else {
        setStatus('error');
        setFeedback('I understood: "' + text + '", but I couldn\'t extract all details. Try: "Sold 2 cakes to Rahul for 500 each".');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setFeedback('Something went wrong while processing your request.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    handleProcessRef.current = handleProcess;
  }, [handleProcess]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        handleProcessRef.current(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setStatus('error');
        if (event.error === 'not-allowed') {
          setFeedback('Microphone access was denied. Please check your browser settings.');
        } else {
          setFeedback('Sorry, I couldn\'t hear you clearly. Please try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setStatus('error');
      setFeedback('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setFeedback('');
      setStatus('listening');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full h-full md:h-auto md:max-w-lg bg-white md:rounded-[40px] shadow-2xl overflow-hidden p-6 md:p-10 flex flex-col justify-center space-y-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-cream rounded-full transition-colors text-ink/40"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-olive/10 text-olive text-[10px] font-bold uppercase tracking-widest">
                <Sparkles size={12} />
                AI Assistant
              </div>
              <h2 className="serif text-3xl font-bold italic text-olive">How can I help you?</h2>
              <p className="text-ink/60 text-sm">You can add ledger entries by voice.</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-8 py-4">
              <div className="relative">
                <AnimatePresence>
                  {isListening && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0.2 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-olive rounded-full"
                    />
                  )}
                </AnimatePresence>
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={processing}
                  className={cn(
                    "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl",
                    isListening ? "bg-red-500 text-white scale-110" : "bg-olive text-white hover:scale-105",
                    processing && "opacity-50"
                  )}
                >
                  {processing ? <Loader2 className="animate-spin" size={32} /> : (isListening ? <MicOff size={32} /> : <Mic size={32} />)}
                </button>
              </div>

              <div className="w-full min-h-[80px] flex flex-col items-center justify-center text-center space-y-4">
                {status === 'listening' && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-olive font-medium animate-pulse"
                  >
                    Listening...
                  </motion.p>
                )}
                
                {transcript && (
                  <p className="text-ink font-medium italic">"{transcript}"</p>
                )}

                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl text-sm font-medium w-full",
                      status === 'success' ? "bg-green-50 text-green-700" : "bg-cream text-ink/60",
                      status === 'error' && "bg-red-50 text-red-700"
                    )}
                  >
                    {feedback}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-ink/5">
              <p className="text-[10px] text-center text-ink/40 uppercase tracking-widest font-bold">
                Try: "Sold 5 Korean Buns to Mrs. Gupta for 120 each"
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

