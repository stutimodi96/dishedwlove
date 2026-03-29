import React, { useState, useEffect } from 'react';
import { User, db, collection, addDoc, query, where, onSnapshot, Timestamp, OperationType, handleFirestoreError, updateDoc, doc, deleteDoc } from '../firebase';
import { LedgerEntry } from '../types';
import { Plus, Calculator, History, Search, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

import { cn } from '../lib/utils';
import VoiceInput from './VoiceInput';

export default function Accounting({ user }: { user: User }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pricingQuery, setPricingQuery] = useState('');
  const [pricingResult, setPricingResult] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);

  const [formData, setFormData] = useState({
    product: '',
    customer: '',
    price: '',
    quantity: '1'
  });

  useEffect(() => {
    const q = query(collection(db, 'ledger'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));
      setEntries(data.sort((a, b) => b.date.toMillis() - a.date.toMillis()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price);
    const quantity = parseFloat(formData.quantity);
    
    try {
      if (editingId) {
        const entryRef = doc(db, 'ledger', editingId);
        await updateDoc(entryRef, {
          product: formData.product,
          customer: formData.customer,
          price,
          quantity,
          total: price * quantity,
        });
      } else {
        const entry: Omit<LedgerEntry, 'id'> = {
          date: Timestamp.now(),
          product: formData.product,
          customer: formData.customer,
          price,
          quantity,
          total: price * quantity,
          uid: user.uid
        };
        await addDoc(collection(db, 'ledger'), entry);
      }
      
      setFormData({ product: '', customer: '', price: '', quantity: '1' });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'ledger');
    }
  };

  const handleEdit = (entry: LedgerEntry) => {
    setFormData({
      product: entry.product,
      customer: entry.customer,
      price: entry.price.toString(),
      quantity: entry.quantity.toString()
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, 'ledger', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'ledger');
      }
    }
  };

  const handlePricePlan = async () => {
    if (!pricingQuery) return;
    setIsPlanning(true);
    try {
      const result = await geminiService.planPricing(pricingQuery);
      setPricingResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="serif text-4xl font-bold italic">Accounting Pro</h1>
          <p className="text-ink/60">Manage your daily ledger and plan your pricing.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (isAdding) {
              setEditingId(null);
              setFormData({ product: '', customer: '', price: '', quantity: '1' });
            }
          }}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus size={20} />
          {editingId ? 'Editing Entry' : 'Add Entry'}
        </button>
      </header>

      {isAdding && (
        <div className="card p-8 border-2 border-olive/20 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Product</label>
                <VoiceInput onTranscript={(text) => setFormData(prev => ({ ...prev, product: text }))} />
              </div>
              <input 
                required
                className="input-field" 
                placeholder="e.g. Korean Cheese Bun"
                value={formData.product}
                onChange={e => setFormData({...formData, product: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Customer</label>
                <VoiceInput onTranscript={(text) => setFormData(prev => ({ ...prev, customer: text }))} />
              </div>
              <input 
                required
                className="input-field" 
                placeholder="Customer Name"
                value={formData.customer}
                onChange={e => setFormData({...formData, customer: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Price (₹)</label>
                <VoiceInput onTranscript={(text) => {
                  const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                  if (!isNaN(num)) setFormData(prev => ({ ...prev, price: num.toString() }));
                }} />
              </div>
              <input 
                required
                type="number"
                className="input-field" 
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Quantity</label>
                <VoiceInput onTranscript={(text) => {
                  const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                  if (!isNaN(num)) setFormData(prev => ({ ...prev, quantity: num.toString() }));
                }} />
              </div>
              <input 
                required
                type="number"
                className="input-field" 
                placeholder="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div className="lg:col-span-4 flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ product: '', customer: '', price: '', quantity: '1' });
                }} 
                className="px-6 py-2 text-ink/40 font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="p-6 border-b border-ink/5 flex items-center gap-3">
              <History size={20} className="text-olive" />
              <h3 className="serif text-xl font-semibold italic">Daily Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-cream/50 text-[10px] uppercase tracking-widest text-ink/40 font-bold">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-cream/20 transition-colors">
                      <td className="px-6 py-4 text-xs">{format(entry.date.toDate(), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4 font-medium text-sm">{entry.product}</td>
                      <td className="px-6 py-4 text-sm text-ink/60">{entry.customer}</td>
                      <td className="px-6 py-4 text-right font-bold text-olive">₹{entry.total}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(entry)}
                            className="p-2 text-ink/40 hover:text-olive hover:bg-olive/10 rounded-lg transition-all"
                            title="Edit Entry"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-ink/40 italic">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-8 space-y-6 bg-olive text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator size={24} />
                <h3 className="serif text-2xl font-semibold italic">Price Planning</h3>
              </div>
              <VoiceInput 
                className="bg-white/20 text-white hover:bg-white/30" 
                onTranscript={(text) => setPricingQuery(prev => prev + (prev ? ' ' : '') + text)} 
              />
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Need help pricing a new item? Tell me the ingredients and time taken.
            </p>
            <div className="space-y-4">
              <textarea 
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all min-h-[120px]"
                placeholder="e.g. 500g flour, 200g butter, 3 hours work for a 1kg cake..."
                value={pricingQuery}
                onChange={e => setPricingQuery(e.target.value)}
              />
              <button 
                onClick={handlePricePlan}
                disabled={isPlanning || !pricingQuery}
                className="w-full bg-white text-olive font-bold py-3 rounded-2xl hover:bg-cream transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPlanning ? 'Calculating...' : 'Get Pricing Advice'}
              </button>
            </div>
          </div>

          {pricingResult && (
            <div className="card p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h4 className="serif text-xl font-semibold italic text-olive">Advice</h4>
              <div className="prose prose-sm prose-olive max-w-none text-ink/80">
                <ReactMarkdown>{pricingResult}</ReactMarkdown>
              </div>
              <button onClick={() => setPricingResult('')} className="text-xs text-ink/40 hover:text-olive">Clear</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
