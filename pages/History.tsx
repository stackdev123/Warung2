

import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Transaction, TransactionType } from '../types';
import { Search, Printer, ArrowDown, Loader2, X, Clock, FileText, Calendar } from 'lucide-react';

export const History: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Receipt State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    // Reset saat filter tanggal berubah
    setPage(1);
    setTransactions([]);
    setHasMore(true);
    loadData(1, selectedDate);
  }, [selectedDate]);

  const loadData = async (pageNum: number, dateFilter: string) => {
    setLoading(true);
    try {
      const res = await db.getTransactionHistory(pageNum, 20, dateFilter);
      if (pageNum === 1) {
        setTransactions(res.data);
      } else {
        setTransactions(prev => [...prev, ...res.data]);
      }
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage, selectedDate);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h1>
           <p className="text-gray-500 text-sm">Arsip penjualan dan restock barang</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-gray-50 pb-4">
        <div className="relative">
          <Calendar className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-primary outline-none bg-white text-gray-800 font-medium"
            placeholder="Pilih Tanggal"
          />
          {selectedDate && (
             <button 
               onClick={() => setSelectedDate('')}
               className="absolute right-3 top-3 p-1 text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 rounded-full transition-colors"
               title="Hapus Filter"
             >
               <X size={16} />
             </button>
          )}
        </div>
        {!selectedDate && (
          <p className="text-xs text-gray-400 mt-2 ml-1">* Menampilkan transaksi terbaru. Pilih tanggal untuk memfilter.</p>
        )}
      </div>

      <div className="space-y-3">
        {transactions.length === 0 && !loading && (
           <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
             <FileText size={48} className="mx-auto mb-2 opacity-30" />
             <p className="font-bold">Tidak ada transaksi ditemukan</p>
             <p className="text-sm">untuk tanggal {selectedDate ? new Date(selectedDate).toLocaleDateString('id-ID') : 'ini'}.</p>
           </div>
        )}

        {transactions.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                 <div className={`p-2 rounded-lg ${t.type === TransactionType.OUT ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                   {t.type === TransactionType.OUT ? <ArrowDown className="rotate-45" size={20} /> : <ArrowDown className="-rotate-135" size={20} />}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">
                     {t.type === TransactionType.OUT ? 'Penjualan' : 'Restock Barang'}
                   </h3>
                   <p className="text-xs text-gray-400 flex items-center gap-1">
                     <Clock size={12} /> {new Date(t.timestamp).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                   </p>
                 </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${t.type === TransactionType.OUT ? 'text-green-600' : 'text-blue-600'}`}>
                  Rp {t.totalAmount.toLocaleString()}
                </p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {t.paymentMethod === 'CASH' ? 'Tunai' : 'Hutang'}
                </span>
              </div>
            </div>

            {t.partyName && (
              <div className="mb-3 text-sm bg-gray-50 p-2 rounded border border-gray-100 flex gap-2">
                 <span className="text-gray-500">{t.type === TransactionType.OUT ? 'Pelanggan:' : 'Supplier:'}</span>
                 <span className="font-bold text-gray-700">{t.partyName}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
               <span className="text-xs text-gray-400">ID: {t.id}</span>
               <button 
                 onClick={() => setSelectedTransaction(t)}
                 className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-primary transition-colors"
               >
                 <Printer size={16} /> Lihat Struk
               </button>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center py-4">
            <Loader2 className="animate-spin mx-auto text-primary" />
          </div>
        )}

        {!loading && hasMore && transactions.length > 0 && (
          <button 
            onClick={handleLoadMore}
            className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            Muat Lebih Banyak
          </button>
        )}
      </div>

      {/* RECEIPT MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedTransaction(null)}
              className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 print:hidden"
            >
              <X size={20} />
            </button>

            {/* Printable Area */}
            <div id="receipt-area" className="font-mono text-sm">
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-300">
                <h2 className="font-bold text-xl uppercase tracking-wider mb-1">WarungPintar</h2>
                <p className="text-xs text-gray-500">Jl. Raya Warung No. 1</p>
                <p className="text-xs text-gray-500">Telp: 0812-3456-7890</p>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{new Date(selectedTransaction.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span>ID: {selectedTransaction.id.slice(-6)}</span>
              </div>

              {selectedTransaction.partyName && (
                <div className="mb-2 text-xs">
                   Pelanggan: <span className="font-bold">{selectedTransaction.partyName}</span>
                </div>
              )}

              {/* ITEM LIST */}
              <div className="border-t border-dashed border-gray-300 py-2 mb-2">
                {selectedTransaction.items.map((item, index) => (
                   <div key={index} className="flex flex-col mb-2 border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0 last:mb-0">
                     <span className="font-bold text-gray-800">{item.name}</span>
                     <div className="flex justify-between items-center text-xs mt-0.5">
                        <span className="text-gray-500">
                          {item.quantity} x {(selectedTransaction.type === TransactionType.OUT ? item.sellPrice : item.buyPrice).toLocaleString()}
                        </span>
                        <span className="font-bold text-gray-800">
                           {(item.quantity * (selectedTransaction.type === TransactionType.OUT ? item.sellPrice : item.buyPrice)).toLocaleString()}
                        </span>
                     </div>
                   </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>Rp {selectedTransaction.totalAmount.toLocaleString()}</span>
                </div>
                {selectedTransaction.paymentMethod === 'CASH' && (
                  <>
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>Tunai</span>
                       <span>Rp {selectedTransaction.amountPaid.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>Kembali</span>
                       <span>Rp {selectedTransaction.change.toLocaleString()}</span>
                     </div>
                     {selectedTransaction.totalAmount > selectedTransaction.amountPaid && (
                       <div className="flex justify-between text-xs text-orange-600 font-bold mt-1">
                         <span>Kurang (Hutang)</span>
                         <span>Rp {(selectedTransaction.totalAmount - selectedTransaction.amountPaid).toLocaleString()}</span>
                       </div>
                     )}
                  </>
                )}
                {selectedTransaction.paymentMethod === 'DEBT' && (
                  <div className="text-center text-xs bg-gray-100 p-1 rounded mt-2">
                    Transaksi Masuk Hutang
                  </div>
                )}
              </div>

              <div className="text-center mt-6 text-xs text-gray-400">
                <p>Terima kasih sudah berbelanja!</p>
                <p>Struk ini dicetak ulang dari riwayat.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3 print:hidden">
              <button 
                onClick={handlePrintReceipt} 
                className="flex-1 bg-gray-800 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-900"
              >
                <Printer size={18} /> Print
              </button>
            </div>
            
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-area, #receipt-area * {
                  visibility: visible;
                }
                #receipt-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 10px;
                }
                @page {
                  margin: 0;
                  size: auto;
                }
              }
            `}</style>

          </div>
        </div>
      )}
    </div>
  );
};