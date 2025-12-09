


import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { DebtRecord, DebtType, ShopStats, LedgerEntry, Transaction, TransactionType } from '../types';
import { Plus, ArrowUpRight, ArrowDownLeft, Wallet, Trash2, Scale, Users, UserPlus, Loader2, X, CreditCard, Book, ChevronRight, MinusCircle, PlusCircle, RefreshCw, Landmark, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const Finance: React.FC = () => {
  const [tab, setTab] = useState<'HUTANG' | 'PIUTANG' | 'NERACA' | 'LEDGER'>('PIUTANG');
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<ShopStats>({
    totalSalesToday: 0, totalProfitToday: 0, lowStockCount: 0,
    totalReceivable: 0, totalPayable: 0, inventoryValue: 0, cashBalance: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<DebtRecord>>({
    partyName: '',
    amount: 0,
    paidAmount: 0,
    description: '',
    type: DebtType.PAYABLE,
    dueDate: Date.now()
  });

  // Partial Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Manual Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerEntryType, setLedgerEntryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  
  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState<string>('');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [newLedgerEntry, setNewLedgerEntry] = useState({ 
    description: '', 
    amount: 0,
    date: todayStr 
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const [savedParties, setSavedParties] = useState<string[]>([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);

  // FILTERS
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNPAID' | 'PAID'>('UNPAID');

  useEffect(() => {
    refreshData();
  }, [tab]);

  useEffect(() => {
    if (isModalOpen) {
      const fetchParties = async () => {
        const data = await db.getParties();
        setSavedParties(data);
      };
      fetchParties();
    }
  }, [isModalOpen]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const s = await db.getStats();
      setStats(s);

      if (tab === 'LEDGER') {
        const ledgerData = await db.getLedger();
        setLedger(ledgerData);
      } else {
        const allDebts = await db.getDebts();
        setDebts(allDebts);
      }
    } catch (e) {
      console.error("Failed to load finance data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDebt.partyName && newDebt.amount) {
      setLoading(true);
      await db.saveDebt({
        id: Date.now().toString(),
        type: tab === 'HUTANG' ? DebtType.PAYABLE : DebtType.RECEIVABLE,
        partyName: newDebt.partyName,
        amount: Number(newDebt.amount),
        paidAmount: 0,
        description: newDebt.description || '',
        dueDate: Date.now(),
        isPaid: false,
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setNewDebt({ partyName: '', amount: 0, description: '' });
      await refreshData();
    }
  };

  const openPaymentModal = (record: DebtRecord) => {
    setSelectedDebt(record);
    const remaining = record.amount - (record.paidAmount || 0);
    setPaymentAmount(remaining.toString());
    setIsPaymentModalOpen(true);
  };

  const handlePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDebt && paymentAmount) {
      const payValue = parseFloat(paymentAmount);
      if (payValue <= 0) return;

      const currentPaid = selectedDebt.paidAmount || 0;
      const newPaidTotal = currentPaid + payValue;
      const isNowPaid = newPaidTotal >= selectedDebt.amount;

      const updatedRecord: DebtRecord = {
        ...selectedDebt,
        paidAmount: newPaidTotal,
        isPaid: isNowPaid
      };

      setLoading(true);
      await db.saveDebt(updatedRecord);
      setIsPaymentModalOpen(false);
      setSelectedDebt(null);
      await refreshData();
    }
  };

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerEntry.description && newLedgerEntry.amount > 0 && newLedgerEntry.date) {
       setLoading(true);
       
       const dateParts = newLedgerEntry.date.split('-').map(Number);
       const now = new Date();
       const timestamp = new Date(
         dateParts[0], 
         dateParts[1] - 1, 
         dateParts[2], 
         now.getHours(), 
         now.getMinutes()
       ).getTime();

       const transaction: Transaction = {
          id: Date.now().toString(),
          type: ledgerEntryType === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
          timestamp: timestamp,
          items: [],
          totalAmount: Number(newLedgerEntry.amount),
          amountPaid: Number(newLedgerEntry.amount),
          change: 0,
          paymentMethod: 'CASH',
          note: newLedgerEntry.description
       };
       
       await db.saveTransaction(transaction);
       setIsLedgerModalOpen(false);
       setNewLedgerEntry({ description: '', amount: 0, date: todayStr });
       await refreshData();
    }
  };

  const handleCashRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    const realCash = parseFloat(actualCash);
    if (isNaN(realCash)) return;

    // Current System Balance is in stats.cashBalance or ledger[0].balance (most recent)
    // Note: ledger is reversed (newest first), so index 0 is latest.
    const currentSystemBalance = ledger.length > 0 ? ledger[0].balance : 0;
    const diff = realCash - currentSystemBalance;

    if (diff === 0) {
      alert("Jumlah sama, tidak perlu revisi.");
      return;
    }

    setLoading(true);
    
    // Create Adjustment Transaction
    // diff > 0 means Real > System. We need to ADD cash (Debit/Surplus).
    // diff < 0 means Real < System. We need to REMOVE cash (Credit/Deficit).
    
    const isSurplus = diff > 0;
    
    const transaction: Transaction = {
       id: Date.now().toString(),
       type: TransactionType.ADJUSTMENT,
       timestamp: Date.now(),
       items: [],
       totalAmount: Math.abs(diff),
       amountPaid: isSurplus ? 1 : 0, // Using amountPaid as flag: 1=Surplus, 0=Deficit
       change: 0,
       paymentMethod: 'CASH',
       note: `Revisi Saldo (Fisik: ${realCash.toLocaleString()})`
    };

    await db.saveTransaction(transaction);
    setIsRevisionModalOpen(false);
    setActualCash('');
    await refreshData();
  };

  const deleteRecord = async (id: string) => {
    if (confirm('Hapus catatan ini?')) {
      setLoading(true);
      await db.deleteDebt(id);
      await refreshData();
    }
  };

  const getGroupedDebts = () => {
    const targetType = tab === 'HUTANG' ? DebtType.PAYABLE : DebtType.RECEIVABLE;
    const filtered = debts.filter(d => d.type === targetType);
    
    const groups: {[key: string]: { total: number, paid: number, count: number, records: DebtRecord[] }} = {};
    
    filtered.forEach(d => {
      // Filter logic applied here for aggregation
      const isPaid = d.isPaid;
      const shouldInclude = 
        filterStatus === 'ALL' ? true :
        filterStatus === 'PAID' ? isPaid :
        !isPaid; // UNPAID

      if (shouldInclude) {
        if (!groups[d.partyName]) {
          groups[d.partyName] = { total: 0, paid: 0, count: 0, records: [] };
        }
        groups[d.partyName].records.push(d);
        groups[d.partyName].total += d.amount;
        groups[d.partyName].paid += (d.paidAmount || 0);
        groups[d.partyName].count += 1;
      }
    });

    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (b.total - b.paid) - (a.total - a.paid));
  };

  const groupedDebts = getGroupedDebts();
  const filteredParties = savedParties.filter(p => p.toLowerCase().includes((newDebt.partyName || '').toLowerCase()));
  const totalOutstanding = groupedDebts.reduce((sum, g) => sum + (g.total - g.paid), 0);

  // --- RENDER SECTIONS ---

  // 0. CHARTS SECTION
  const renderCharts = () => {
    // Top 5 Customers/Suppliers by Remaining Debt
    const chartData = groupedDebts
      .map(g => ({
        name: g.name.split(' ')[0], // First name only to save space
        fullName: g.name,
        Sisa: g.total - g.paid,
        Dibayar: g.paid
      }))
      .sort((a, b) => b.Sisa - a.Sisa)
      .slice(0, 5);

    const barColor = tab === 'HUTANG' ? '#ef4444' : '#10b981'; // Red or Emerald
    const paidColor = '#e2e8f0'; // Gray for paid portion

    if (chartData.length === 0) return null;

    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-top-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={18} />
            Top 5 {tab === 'HUTANG' ? 'Hutang Terbesar' : 'Piutang Terbesar'}
          </h3>
          <span className="text-xs font-medium text-gray-400">vs Pembayaran</span>
        </div>
        
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                <Bar dataKey="Dibayar" stackId="a" fill={paidColor} radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="Sisa" stackId="a" fill={barColor} radius={[0, 4, 4, 0]} barSize={20} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // 1. GROUPED LIST (CUSTOMER LEDGER SUMMARY)
  const renderGroupedList = () => (
    <>
       {/* FILTER CONTROLS */}
       <div className="flex justify-between items-center mb-4 overflow-x-auto">
         <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterStatus('UNPAID')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterStatus === 'UNPAID' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Belum Lunas
            </button>
            <button 
              onClick={() => setFilterStatus('PAID')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterStatus === 'PAID' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lunas
            </button>
            <button 
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semua
            </button>
         </div>
       </div>

       {/* CHART */}
       {renderCharts()}
       
       {/* SUMMARY CARD */}
       <div className={`p-6 rounded-2xl shadow-lg mb-6 text-white overflow-hidden relative ${tab === 'HUTANG' ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-200' : 'bg-gradient-to-br from-primary to-primary/80 shadow-primary/30'}`}>
          <div className="absolute right-0 top-0 p-4 opacity-10">
             {tab === 'HUTANG' ? <ArrowDownLeft size={120}/> : <ArrowUpRight size={120}/>}
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <p className="font-bold text-sm uppercase tracking-wide">Total {tab === 'HUTANG' ? 'Hutang Anda' : 'Piutang Pelanggan'} ({filterStatus === 'ALL' ? 'Semua' : filterStatus === 'UNPAID' ? 'Sisa' : 'Lunas'})</p>
            </div>
            <p className="text-4xl font-bold">
              Rp {totalOutstanding.toLocaleString()}
            </p>
          </div>
       </div>

       {loading ? (
         <div className="text-center py-10 text-gray-400">
           <Loader2 className="animate-spin mx-auto mb-2" />
           <p>Memuat data...</p>
         </div>
       ) : (
         <div className="space-y-3 pb-24">
           {groupedDebts.length === 0 && (
             <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
               <Users className="mx-auto mb-2 opacity-30" size={48}/>
               <p>Data tidak ditemukan untuk filter ini.</p>
             </div>
           )}
           
           {groupedDebts.map(group => {
             const remaining = group.total - group.paid;
             
             return (
               <div 
                 key={group.name} 
                 onClick={() => setSelectedCustomer(group.name)}
                 className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 active:scale-[0.99] transition-all cursor-pointer flex justify-between items-center group"
               >
                 <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md ${tab === 'HUTANG' ? 'bg-red-500' : 'bg-primary'}`}>
                      {group.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-800 text-lg">{group.name}</h3>
                     <p className="text-xs text-gray-500 font-medium">{group.count} Catatan</p>
                   </div>
                 </div>
                 <div className="text-right">
                    <span className={`font-bold text-lg block ${tab === 'HUTANG' ? 'text-red-600' : 'text-primary'}`}>
                      Rp {remaining.toLocaleString()}
                    </span>
                    <div className="flex items-center justify-end text-gray-400 gap-1 text-xs font-bold mt-1 group-hover:text-primary transition-colors">
                       Detail <ChevronRight size={14} />
                    </div>
                 </div>
               </div>
             );
           })}
         </div>
       )}
    </>
  );

  // 2. NERACA (BALANCE SHEET)
  const renderNeraca = () => {
    const totalAssets = stats.cashBalance + stats.inventoryValue + stats.totalReceivable;
    // Kewajiban (Hutang)
    const totalLiabilities = stats.totalPayable;
    // Ekuitas (Modal) = Aset - Kewajiban
    const totalEquity = totalAssets - totalLiabilities;
    // Total Pasiva = Kewajiban + Ekuitas (Harus sama dengan Total Aset)
    const totalPasiva = totalLiabilities + totalEquity;

    return (
      <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
         {/* HEADER SUMMARY */}
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <p className="text-blue-100 text-xs mb-2 font-bold tracking-widest uppercase opacity-80">Keseimbangan Neraca</p>
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="text-4xl font-bold tracking-tight">Rp {totalAssets.toLocaleString()}</h2>
                  <p className="text-xs text-blue-200 mt-1">Total Nilai Bisnis</p>
               </div>
               <div className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur text-xs font-bold flex items-center gap-1">
                 <Scale size={14} /> Seimbang
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AKTIVA (ASSETS) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
               <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-2">
                  <ArrowUpRight className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-emerald-800">Aktiva (Aset)</h3>
               </div>
               <div className="divide-y divide-gray-50">
                  <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Wallet size={20}/></div>
                        <div>
                           <p className="font-bold text-gray-800">Kas Tunai</p>
                           <p className="text-xs text-gray-500">Uang fisik</p>
                        </div>
                     </div>
                     <span className="font-bold text-gray-800 text-lg">Rp {stats.cashBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Book size={20}/></div>
                        <div>
                           <p className="font-bold text-gray-800">Persediaan</p>
                           <p className="text-xs text-gray-500">Nilai stok</p>
                        </div>
                     </div>
                     <span className="font-bold text-gray-800 text-lg">Rp {stats.inventoryValue.toLocaleString()}</span>
                  </div>
                  <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users size={20}/></div>
                        <div>
                           <p className="font-bold text-gray-800">Piutang</p>
                           <p className="text-xs text-gray-500">Tagihan pelanggan</p>
                        </div>
                     </div>
                     <span className="font-bold text-gray-800 text-lg">Rp {stats.totalReceivable.toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-emerald-50 flex justify-between items-center font-bold text-emerald-800 border-t border-emerald-100">
                     <span>Total Aktiva</span>
                     <span>Rp {totalAssets.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* PASIVA (LIABILITIES + EQUITY) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
               <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-2">
                  <ArrowDownLeft className="text-blue-600" size={20} />
                  <h3 className="font-bold text-blue-800">Pasiva (Kewajiban & Modal)</h3>
               </div>
               <div className="divide-y divide-gray-50">
                  <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl"><CreditCard size={20}/></div>
                        <div>
                           <p className="font-bold text-gray-800">Hutang Usaha</p>
                           <p className="text-xs text-gray-500">Kewajiban Supplier</p>
                        </div>
                     </div>
                     <span className="font-bold text-gray-800 text-lg">Rp {stats.totalPayable.toLocaleString()}</span>
                  </div>
                  <div className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                     <div className="flex gap-4 items-center">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Landmark size={20}/></div>
                        <div>
                           <p className="font-bold text-gray-800">Modal Bersih</p>
                           <p className="text-xs text-gray-500">Ekuitas Pemilik (Aset - Hutang)</p>
                        </div>
                     </div>
                     <span className="font-bold text-gray-800 text-lg">Rp {totalEquity.toLocaleString()}</span>
                  </div>
                  
                  {/* Spacer untuk menyamakan tinggi jika perlu, atau biarkan dinamis */}
                   <div className="p-5 opacity-0 pointer-events-none hidden md:block">
                     <div className="h-5"></div>
                  </div>

                  <div className="p-4 bg-blue-50 flex justify-between items-center font-bold text-blue-800 border-t border-blue-100">
                     <span>Total Pasiva</span>
                     <span>Rp {totalPasiva.toLocaleString()}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  // 3. LEDGER TABLE (BUKU KAS)
  const renderLedger = () => (
    <div className="space-y-6 pb-24 animate-in fade-in">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="animate-spin mx-auto text-primary" />
            <p className="text-sm text-gray-500 mt-2">Menyiapkan Buku Kas...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {ledger.length > 0 && (
              <div className="p-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                 <div className="absolute right-0 top-0 p-4 opacity-10">
                   <Book size={100}/>
                 </div>
                 <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <p className="text-violet-100 text-xs font-bold uppercase tracking-widest mb-2">Saldo Kas Fisik Saat Ini</p>
                      <p className="text-5xl font-bold">Rp {ledger[0].balance.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => { setActualCash(''); setIsRevisionModalOpen(true); }}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-sm transition-colors border border-white/20"
                    >
                      <RefreshCw size={16} /> Revisi Saldo
                    </button>
                 </div>
              </div>
            )}
            
            <div className="flex gap-3 p-4 bg-gray-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => { setLedgerEntryType('INCOME'); setIsLedgerModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-colors whitespace-nowrap shadow-sm"
                >
                  <PlusCircle size={18} /> Catat Pemasukan
                </button>
                <button 
                  onClick={() => { setLedgerEntryType('EXPENSE'); setIsLedgerModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors whitespace-nowrap shadow-sm"
                >
                  <MinusCircle size={18} /> Catat Pengeluaran
                </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 sticky top-[60px] md:top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap bg-gray-50">Tanggal</th>
                    <th className="px-6 py-4 bg-gray-50">Keterangan</th>
                    <th className="px-6 py-4 text-right text-green-600 bg-gray-50">Masuk</th>
                    <th className="px-6 py-4 text-right text-red-600 bg-gray-50">Keluar</th>
                    <th className="px-6 py-4 text-right bg-gray-50">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledger.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-medium">
                        {new Date(entry.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 ${
                          entry.category === 'KOREKSI' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                        }`}>{entry.category}</span>
                        <p className="text-sm text-gray-700 font-medium">{entry.description}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        {entry.type === 'DEBIT' ? `+ ${entry.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-500">
                        {entry.type === 'CREDIT' ? `- ${entry.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800 bg-gray-50/30">
                        Rp {entry.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Belum ada transaksi kas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 tracking-tight">Pusat Keuangan</h1>
      
      {/* TABS Navigation - Segmented Control Style */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-4">
        <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setTab('PIUTANG')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 transition-all duration-200 ${tab === 'PIUTANG' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <ArrowUpRight size={18} /> Piutang
          </button>
          <button 
            onClick={() => setTab('HUTANG')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 transition-all duration-200 ${tab === 'HUTANG' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <ArrowDownLeft size={18} /> Hutang
          </button>
          <button 
            onClick={() => setTab('NERACA')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 transition-all duration-200 ${tab === 'NERACA' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Scale size={18} /> Neraca
          </button>
           <button 
            onClick={() => setTab('LEDGER')} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 transition-all duration-200 ${tab === 'LEDGER' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Book size={18} /> Buku Kas
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="mt-2">
        {tab === 'HUTANG' || tab === 'PIUTANG' ? (
          <>
            {renderGroupedList()}
            {/* Floating Action Button */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="fixed bottom-24 right-6 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl shadow-gray-500/50 hover:scale-105 transition-transform z-30 flex items-center justify-center"
            >
              <Plus size={28} />
            </button>
          </>
        ) : tab === 'NERACA' ? renderNeraca() : renderLedger()}
      </div>


      {/* DETAIL CUSTOMER MODAL (FULL SCREEN / BOTTOM SHEET STYLE) */}
      {selectedCustomer && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
               {/* Modal Header */}
               <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                  <div>
                     <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Rincian {tab === 'HUTANG' ? 'Hutang' : 'Piutang'}</p>
                     <h2 className="text-2xl font-bold text-gray-800">{selectedCustomer}</h2>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X size={20}/></button>
               </div>

               {/* Customer Ledger */}
               <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                  {debts
                     .filter(d => d.partyName === selectedCustomer && d.type === (tab === 'HUTANG' ? DebtType.PAYABLE : DebtType.RECEIVABLE))
                     .sort((a,b) => b.createdAt - a.createdAt) // Newest first
                     .map(d => {
                        const paid = d.paidAmount || 0;
                        const remaining = d.amount - paid;
                        const percent = Math.min((paid / d.amount) * 100, 100);

                        return (
                           <div key={d.id} className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 ${d.isPaid ? 'border-gray-300 opacity-60' : (tab === 'HUTANG' ? 'border-red-500' : 'border-primary')}`}>
                              <div className="flex justify-between mb-3">
                                 <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                                    <p className="font-bold text-gray-800 text-lg">{d.description || 'Tanpa Keterangan'}</p>
                                 </div>
                                 <span className={`font-bold text-xl ${tab === 'HUTANG' ? 'text-red-600' : 'text-primary'}`}>Rp {d.amount.toLocaleString()}</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-100 h-2.5 rounded-full mb-3 overflow-hidden">
                                 <div className={`h-full rounded-full transition-all duration-500 ${d.isPaid ? 'bg-gray-400' : (tab === 'HUTANG' ? 'bg-red-500' : 'bg-primary')}`} style={{width: `${percent}%`}}></div>
                              </div>
                              
                              <div className="flex justify-between items-center mt-2">
                                 <p className="text-xs text-gray-500 font-medium">
                                    Bayar: <b>Rp {paid.toLocaleString()}</b>
                                    {!d.isPaid && <span className="text-red-500 ml-1 font-bold">(Sisa: {remaining.toLocaleString()})</span>}
                                 </p>
                                 <div className="flex gap-2">
                                    <button onClick={() => deleteRecord(d.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                    {!d.isPaid && (
                                       <button onClick={() => openPaymentModal(d)} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-lg hover:bg-black transition-colors">Bayar</button>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )
                     })
                  }
               </div>
            </div>
         </div>
      )}

      {/* Manual Ledger Entry Modal */}
      {isLedgerModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in duration-200 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-gray-800">
                 {ledgerEntryType === 'INCOME' ? 'Catat Pemasukan' : 'Catat Pengeluaran'}
               </h2>
               <button onClick={() => setIsLedgerModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddLedgerEntry} className="space-y-5">
               <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Keterangan</label>
                <input 
                  type="text" 
                  value={newLedgerEntry.description} 
                  onChange={e => setNewLedgerEntry({...newLedgerEntry, description: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none transition-all font-medium"
                  placeholder={ledgerEntryType === 'INCOME' ? "Contoh: Jual Kardus Bekas" : "Contoh: Bayar Listrik"}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tanggal</label>
                <input 
                  type="date" 
                  value={newLedgerEntry.date} 
                  onChange={e => setNewLedgerEntry({...newLedgerEntry, date: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nominal</label>
                <div className="relative">
                   <span className="absolute left-4 top-4 font-bold text-gray-400">Rp</span>
                   <input 
                     type="number" 
                     value={newLedgerEntry.amount || ''} 
                     onChange={e => setNewLedgerEntry({...newLedgerEntry, amount: parseInt(e.target.value)})}
                     className="w-full pl-12 p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none font-bold text-xl transition-all"
                     placeholder="0"
                     required
                   />
                </div>
              </div>

               <button 
                type="submit" 
                disabled={loading} 
                className={`w-full py-4 text-white rounded-xl font-bold shadow-xl mt-2 ${ledgerEntryType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
         </div>
      )}

      {/* Revision / Koreksi Saldo Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><RefreshCw size={20}/> Revisi Saldo Kas</h2>
               <button onClick={() => setIsRevisionModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
               Masukkan jumlah uang fisik yang ada di laci saat ini. Sistem akan otomatis membuat transaksi koreksi untuk menyamakan saldo.
            </p>
            
            <form onSubmit={handleCashRevision} className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Total Uang Fisik (Real)</label>
                <div className="relative">
                   <span className="absolute left-4 top-4 text-gray-400 font-bold text-lg">Rp</span>
                   <input 
                    type="number" 
                    value={actualCash} 
                    onChange={e => setActualCash(e.target.value)}
                    className="w-full pl-12 pr-4 p-4 bg-white border-2 border-primary rounded-xl focus:outline-none text-2xl font-bold shadow-sm"
                    placeholder="0"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-colors">
                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Hutang/Piutang */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-gray-800">Catat {tab === 'HUTANG' ? 'Hutang Baru' : 'Piutang Baru'}</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddDebt} className="space-y-5">
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                   Nama {tab === 'HUTANG' ? 'Supplier' : 'Pelanggan'}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newDebt.partyName} 
                    onChange={e => {
                      setNewDebt({...newDebt, partyName: e.target.value});
                      setShowPartySuggestions(true);
                    }}
                    onFocus={() => setShowPartySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                    className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none font-medium transition-all"
                    placeholder="Contoh: Bu Siti"
                    required
                  />
                  <Users className="absolute right-4 top-4 text-gray-400" size={20} />
                </div>
                
                {showPartySuggestions && newDebt.partyName && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-xl rounded-xl mt-2 z-50 max-h-32 overflow-y-auto">
                    {filteredParties.map((name, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setNewDebt({...newDebt, partyName: name});
                          setShowPartySuggestions(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium border-b border-gray-50"
                      >
                        {name}
                      </div>
                    ))}
                    {!filteredParties.includes(newDebt.partyName) && (
                      <div className="px-4 py-3 bg-blue-50 text-blue-600 text-sm font-bold flex items-center gap-2">
                        <UserPlus size={16} /> Gunakan Nama Baru
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nominal</label>
                <div className="relative">
                   <span className="absolute left-4 top-4 font-bold text-gray-400">Rp</span>
                   <input 
                     type="number" 
                     value={newDebt.amount || ''} 
                     onChange={e => setNewDebt({...newDebt, amount: parseInt(e.target.value)})}
                     className="w-full pl-12 p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none font-bold text-xl transition-all"
                     placeholder="0"
                     required
                   />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Catatan</label>
                <input 
                  type="text" 
                  value={newDebt.description || ''} 
                  onChange={e => setNewDebt({...newDebt, description: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-primary outline-none font-medium transition-all"
                  placeholder="Keterangan singkat..."
                />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-black transition-all mt-2">
                {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Simpan Catatan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      {isPaymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in duration-200 shadow-2xl">
            <h2 className="text-xl font-bold mb-1 text-gray-800">Bayar {tab === 'HUTANG' ? 'Hutang' : 'Piutang'}</h2>
            <p className="text-gray-500 text-sm mb-6 font-medium">Ke: <span className="text-gray-800 font-bold">{selectedDebt.partyName}</span></p>
            
            <form onSubmit={handlePartialPayment} className="space-y-6">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                 <div className="flex justify-between text-sm text-gray-500 mb-2 font-medium">
                   <span>Total Awal</span>
                   <span>Rp {selectedDebt.amount.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-500 mb-2 font-medium">
                   <span>Sudah Dibayar</span>
                   <span>- Rp {(selectedDebt.paidAmount || 0).toLocaleString()}</span>
                 </div>
                 <div className="border-t border-gray-200 my-2 pt-3 flex justify-between font-bold text-lg">
                   <span>Sisa Tagihan</span>
                   <span className="text-primary">Rp {(selectedDebt.amount - (selectedDebt.paidAmount || 0)).toLocaleString()}</span>
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Jumlah Pembayaran</label>
                <div className="relative">
                   <span className="absolute left-4 top-4 text-gray-400 font-bold text-lg">Rp</span>
                   <input 
                    type="number" 
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full pl-12 pr-4 p-4 bg-white border-2 border-primary rounded-xl focus:outline-none text-2xl font-bold shadow-sm"
                    placeholder="0"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-colors">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};