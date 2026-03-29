import React, { useState, useEffect } from 'react';
import { User, db, collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from '../firebase';
import { InventoryItem } from '../types';
import { Plus, Package, Trash2, Tag, Filter } from 'lucide-react';

import { cn } from '../lib/utils';
import VoiceInput from './VoiceInput';

export default function Inventory({ user }: { user: User }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState('All');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Cakes',
    imageUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: Omit<InventoryItem, 'id'> = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      imageUrl: formData.imageUrl || `https://picsum.photos/seed/${formData.name}/600/800`,
      uid: user.uid
    };

    try {
      await addDoc(collection(db, 'inventory'), item);
      setFormData({ name: '', description: '', price: '', category: 'Cakes', imageUrl: '' });
      setIsAdding(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const categories = ['All', 'Cakes', 'Breads', 'Pizzas', 'Tarts', 'Buns', 'Other'];
  const filteredItems = filter === 'All' ? items : items.filter(i => i.category === filter);

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="serif text-4xl font-bold italic">Inventory Catalog</h1>
          <p className="text-ink/60">Maintain a record of your beautiful creations.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus size={20} />
          Add Item
        </button>
      </header>

      {isAdding && (
        <div className="card p-8 border-2 border-olive/20 animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Item Name</label>
                <VoiceInput onTranscript={(text) => setFormData(prev => ({ ...prev, name: text }))} />
              </div>
              <input 
                required
                className="input-field" 
                placeholder="e.g. Korean Cheese Bun"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Category</label>
              <select 
                className="input-field"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Reference Price (₹)</label>
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
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Description</label>
                <VoiceInput onTranscript={(text) => setFormData(prev => ({ ...prev, description: text }))} />
              </div>
              <input 
                className="input-field" 
                placeholder="e.g. Soft, buttery, filled with cream cheese..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/40">Image URL (Optional)</label>
              <input 
                className="input-field" 
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              />
            </div>
            <div className="lg:col-span-3 flex justify-end gap-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-ink/40 font-medium">Cancel</button>
              <button type="submit" className="btn-primary">Save to Catalog</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
        <Filter size={16} className="text-ink/40 shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              filter === cat ? "bg-olive text-white" : "bg-white text-ink/60 hover:bg-olive/5"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredItems.map((item) => (
          <div key={item.id} className="card group overflow-hidden flex flex-col">
            <div className="aspect-[3/4] relative overflow-hidden">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleDelete(item.id!)}
                  className="p-2 bg-white/90 backdrop-blur rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-olive shadow-lg">
                  {item.category}
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="serif text-xl font-bold italic leading-tight">{item.name}</h3>
                <p className="font-bold text-olive shrink-0">₹{item.price}</p>
              </div>
              <p className="text-xs text-ink/60 line-clamp-2 italic leading-relaxed flex-1">
                {item.description || 'No description provided.'}
              </p>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-ink/40 space-y-4">
            <Package size={48} strokeWidth={1} />
            <p className="italic">No items found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

