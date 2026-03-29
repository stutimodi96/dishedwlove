import React, { useState, useEffect, useMemo } from 'react';
import { User, db, collection, query, where, onSnapshot, Timestamp } from '../firebase';
import { LedgerEntry, InventoryItem } from '../types';
import { TrendingUp, ShoppingBag, Users, DollarSign, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isSameDay, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

import { cn } from '../lib/utils';

export default function Dashboard({ user }: { user: User }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const q = query(collection(db, 'ledger'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));
      setEntries(data.sort((a, b) => b.date.toMillis() - a.date.toMillis()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'inventory'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Daily Chart Data (Last 14 days)
  const chartData = useMemo(() => {
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date(),
    });

    return last14Days.map(day => {
      const dayEntries = entries.filter(e => isSameDay(e.date.toDate(), day));
      return {
        date: format(day, 'MMM d'),
        revenue: dayEntries.reduce((acc, curr) => acc + curr.total, 0),
        orders: dayEntries.length,
      };
    });
  }, [entries]);

  // Monthly Summary Data
  const monthlySummaries = useMemo(() => {
    const summaries: Record<string, { revenue: number, orders: number, customers: Set<string> }> = {};
    
    entries.forEach(entry => {
      const monthKey = format(entry.date.toDate(), 'yyyy-MM');
      if (!summaries[monthKey]) {
        summaries[monthKey] = { revenue: 0, orders: 0, customers: new Set() };
      }
      summaries[monthKey].revenue += entry.total;
      summaries[monthKey].orders += 1;
      summaries[monthKey].customers.add(entry.customer);
    });

    return Object.entries(summaries)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({
        key,
        label: format(parseISO(`${key}-01`), 'MMMM yyyy'),
        revenue: data.revenue,
        orders: data.orders,
        customers: data.customers.size,
      }));
  }, [entries]);

  const currentMonthSummary = monthlySummaries.find(s => s.key === selectedMonth) || {
    revenue: 0,
    orders: 0,
    customers: 0,
    label: format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
  };

  const totalSales = entries.reduce((acc, curr) => acc + curr.total, 0);
  const totalOrders = entries.length;
  const uniqueCustomers = new Set(entries.map(e => e.customer)).size;
  const inventoryCount = inventory.length;

  const stats = [
    { label: 'Total Revenue', value: `₹${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'text-blue-600' },
    { label: 'Customers', value: uniqueCustomers, icon: Users, color: 'text-purple-600' },
    { label: 'Inventory Items', value: inventoryCount, icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="serif text-4xl font-bold italic">Welcome back, Rashmi</h1>
        <p className="text-ink/60">Here's what's happening with Dished with Love today.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="card p-6 flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl bg-opacity-10", stat.color.replace('text', 'bg'))}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/40 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="serif text-2xl font-semibold italic">Daily Performance</h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-ink/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-olive"></div>
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Orders</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#141414', opacity: 0.4 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#5A5A40" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-olive" size={24} />
            <h3 className="serif text-2xl font-semibold italic">Monthly Summary</h3>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {monthlySummaries.map((summary) => (
              <button
                key={summary.key}
                onClick={() => setSelectedMonth(summary.key)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                  selectedMonth === summary.key 
                    ? "bg-olive text-white shadow-lg shadow-olive/20" 
                    : "bg-cream text-ink/40 hover:bg-cream/80"
                )}
              >
                {format(parseISO(`${summary.key}-01`), 'MMM yy')}
              </button>
            ))}
            {monthlySummaries.length === 0 && (
              <button className="px-4 py-2 rounded-full text-xs font-bold bg-cream text-ink/40">
                {format(new Date(), 'MMM yy')}
              </button>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-2xl bg-cream/50 border border-ink/5 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Revenue</p>
              <p className="text-2xl font-bold text-olive">₹{currentMonthSummary.revenue.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-cream/50 border border-ink/5 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Orders</p>
                <p className="text-xl font-bold">{currentMonthSummary.orders}</p>
              </div>
              <div className="p-4 rounded-2xl bg-cream/50 border border-ink/5 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-ink/40 font-bold">Customers</p>
                <p className="text-xl font-bold">{currentMonthSummary.customers}</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-ink/30 italic pt-2">
              Summary for {currentMonthSummary.label}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-8 space-y-6">
          <h3 className="serif text-2xl font-semibold italic">Recent Sales</h3>
          <div className="space-y-4">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl bg-cream/50 border border-ink/5">
                <div>
                  <p className="font-semibold text-sm">{entry.product}</p>
                  <p className="text-xs text-ink/40">{entry.customer} • {format(entry.date.toDate(), 'MMM d, h:mm a')}</p>
                </div>
                <p className="font-bold text-olive">₹{entry.total}</p>
              </div>
            ))}
            {entries.length === 0 && <p className="text-center text-ink/40 py-10 italic">No sales recorded yet.</p>}
          </div>
        </div>

        <div className="card p-8 space-y-6">
          <h3 className="serif text-2xl font-semibold italic">Top Items</h3>
          <div className="space-y-4">
             {inventory.slice(0, 5).map((item) => (
               <div key={item.id} className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full overflow-hidden bg-olive/5">
                   <img src={item.imageUrl || `https://picsum.photos/seed/${item.name}/100/100`} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 </div>
                 <div className="flex-1">
                   <p className="font-semibold text-sm">{item.name}</p>
                   <p className="text-xs text-ink/40">{item.category || 'General'}</p>
                 </div>
                 <p className="font-bold text-olive">₹{item.price}</p>
               </div>
             ))}
             {inventory.length === 0 && <p className="text-center text-ink/40 py-10 italic">No inventory items yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

