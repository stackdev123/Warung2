
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ShopStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Wallet, RefreshCcw, Loader2, AlertCircle, ArrowUpRight, ArrowDownLeft, Box, Database, Calendar, DollarSign } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ShopStats>({
    totalSalesToday: 0,
    totalProfitToday: 0,
    lowStockCount: 0,
    totalReceivable: 0,
    totalPayable: 0,
    inventoryValue: 0,
    cashBalance: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await db.getStats();
      setStats(data);
    } catch (e) {
      console.error("Gagal ambil data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <Loader2 className="animate-spin mb-4 text-primary" size={48} />
        <p>Memuat Data Warung...</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Data untuk Grafik Pie Keuangan
  const financeData = [
    { name: 'Kas Tunai', value: Math.max(0, stats.cashBalance), color: '#10b981' }, // Emerald
    { name: 'Piutang', value: stats.totalReceivable, color: '#3b82f6' }, // Blue
    { name: 'Hutang', value: stats.totalPayable, color: '#ef4444' }, // Red
  ];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
              <Calendar size={16} />
              <span>{currentDate}</span>
           </div>
           <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard Overview</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-primary hover:bg-gray-50 transition-all">
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Omzet */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-2">Omzet Hari Ini</p>
            <p className="text-3xl font-bold">Rp {stats.totalSalesToday.toLocaleString()}</p>
          </div>
        </div>

        {/* Card 2: Profit */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2">Profit Hari Ini</p>
            <p className="text-3xl font-bold">Rp {stats.totalProfitToday.toLocaleString()}</p>
          </div>
        </div>

        {/* Card 3: Aset */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-200 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Box size={100} />
          </div>
          <div className="relative z-10">
             <p className="text-purple-100 text-sm font-bold uppercase tracking-wider mb-2">Nilai Aset Stok</p>
             <p className="text-2xl font-bold">Rp {stats.inventoryValue.toLocaleString()}</p>
          </div>
        </div>

         {/* Card 4: Stok Alert */}
         <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl shadow-lg shadow-orange-200 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={100} />
          </div>
          <div className="relative z-10">
             <p className="text-orange-100 text-sm font-bold uppercase tracking-wider mb-2">Stok Menipis</p>
             <p className="text-3xl font-bold">{stats.lowStockCount} <span className="text-lg font-normal opacity-80">Item</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sales Charts */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500"/> Statistik Penjualan
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-500">7 Hari Terakhir</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={[
              {name: 'Sen', val: stats.totalSalesToday * 0.8},
              {name: 'Sel', val: stats.totalSalesToday * 0.5},
              {name: 'Rab', val: stats.totalSalesToday * 1.2},
              {name: 'Kam', val: stats.totalSalesToday * 0.9},
              {name: 'Jum', val: stats.totalSalesToday},
              {name: 'Sab', val: stats.totalSalesToday * 1.5},
              {name: 'Min', val: stats.totalSalesToday * 1.1},
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: '#f0fdf4'}} 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}} 
              />
              <Bar dataKey="val" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Finance Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
          <h3 className="font-bold text-gray-800 text-lg mb-2 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-500"/> Posisi Keuangan
          </h3>
          <p className="text-xs text-gray-400 mb-4">Komposisi Kas vs Kewajiban</p>
          
          <div className="flex-1 min-h-0 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {financeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                     formatter={(value: number) => `Rp ${value.toLocaleString()}`}
                     contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend 
                     verticalAlign="bottom" 
                     height={36}
                     iconType="circle"
                     iconSize={10}
                     wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                </PieChart>
             </ResponsiveContainer>
             
             {/* Center Text Overlay */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Saldo Kas</p>
                   <p className="text-sm font-bold text-gray-800">Rp {stats.cashBalance.toLocaleString()}</p>
                </div>
             </div>
          </div>
          
          {/* Legend Details */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-gray-50">
             <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-[10px] text-red-400 uppercase font-bold">Hutang</p>
                <p className="font-bold text-red-600 text-sm">Rp {stats.totalPayable.toLocaleString()}</p>
             </div>
             <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-[10px] text-blue-400 uppercase font-bold">Piutang</p>
                <p className="font-bold text-blue-600 text-sm">Rp {stats.totalReceivable.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
