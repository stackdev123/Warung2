import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Product, CartItem, Transaction, TransactionType, DebtType } from '../types';
import { Scanner } from '../components/Scanner';
import { Scan, ShoppingCart, Minus, Plus, Trash, CheckCircle, Banknote, BookOpen, X, Search, Package, Users, Loader2, Printer, History, FileText, ArrowRight, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const POS: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<TransactionType>(TransactionType.OUT);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Manual Search State (Integrated in desktop view)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>(''); 
  const [partyName, setPartyName] = useState(''); 
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const [savedParties, setSavedParties] = useState<string[]>([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);

  // OPTIMISASI: Map untuk lookup produk super cepat (O(1))
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach(p => map.set(p.barcode, p));
    return map;
  }, [allProducts]);

  // Handle Mode Switch via Navigation State (e.g. from Master Data)
  useEffect(() => {
    if (location.state && location.state.mode) {
      setMode(location.state.mode);
    } else {
      // Default to OUT (Sales) if no state provided
      setMode(TransactionType.OUT);
    }
  }, [location]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const data = await db.getProducts();
      setAllProducts(data);
      setIsLoadingProducts(false);
    };
    fetchProducts();
  }, [successMsg]);

  useEffect(() => {
    if (isPaymentModalOpen) {
      const fetchParties = async () => {
        const data = await db.getParties();
        setSavedParties(data);
      };
      fetchParties();
    }
  }, [isPaymentModalOpen]);

  useEffect(() => {
    if (scanFeedback) {
      const timer = setTimeout(() => setScanFeedback(null), 1000); // Feedback lebih cepat hilang (1s)
      return () => clearTimeout(timer);
    }
  }, [scanFeedback]);

  // OPTIMISASI: Gunakan Audio Oscillator untuk suara beep Instan (Tanpa Network/Loading)
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, ctx.currentTime); // High pitch beep
      gain.gain.setValueAtTime(0.1, ctx.currentTime); // Volume
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1); // Durasi 100ms
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const handleScan = (code: string) => {
    // OPTIMISASI: Gunakan Map.get() daripada Array.find()
    const product = productMap.get(code);

    if (product) {
      playBeep();
      addToCart(product);
      setScanFeedback(`${product.name} (+1)`);
    } else {
      // playBeep() untuk error bisa dibuat nada berbeda jika mau, sementara pakai beep biasa
      playBeep(); 
      // Opsional: Vibration feedback jika di mobile
      if (navigator.vibrate) navigator.vibrate(200);
      alert(`Produk dengan kode ${code} tidak ditemukan!`);
    }
  };

  const addToCart = (product: Product, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.barcode === product.barcode);
      if (existing) {
        return prev.map(item => 
          item.barcode === product.barcode 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
  };

  const updateQty = (barcode: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.barcode === barcode) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (barcode: string) => {
    setCart(prev => prev.filter(item => item.barcode !== barcode));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const price = mode === TransactionType.OUT ? item.sellPrice : item.buyPrice;
      return sum + (price * item.quantity);
    }, 0);
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('CASH');
    setAmountPaid('');
    setPartyName('');
    setIsPaymentModalOpen(true);
  };

  const handlePrintBill = () => {
    if (cart.length === 0) return;
    const totalAmount = calculateTotal();
    
    const billTransaction: Transaction = {
      id: 'DRAFT', 
      type: mode,
      timestamp: Date.now(),
      items: [...cart],
      totalAmount,
      paymentMethod: 'CASH',
      amountPaid: 0,
      change: 0,
    };

    setLastTransaction(billTransaction);
    setShowReceipt(true);
  };

  const handleConfirmPayment = async () => {
    const totalAmount = calculateTotal();
    let paid = parseFloat(amountPaid) || 0;

    // Untuk Restock CASH, dianggap lunas (Paid = Total)
    if (mode === TransactionType.IN && paymentMethod === 'CASH') {
      paid = totalAmount; 
    }
    
    const isPartialPayment = mode === TransactionType.OUT && paymentMethod === 'CASH' && paid < totalAmount;
    const isDebtInvolved = paymentMethod === 'DEBT' || isPartialPayment;

    if (isDebtInvolved && !partyName.trim()) {
      alert(`⚠️ WAJIB ISI NAMA!`);
      return;
    }

    setIsProcessingPayment(true);

    let debtAmount = 0;
    if (paymentMethod === 'DEBT') {
      debtAmount = totalAmount; 
    } else if (isPartialPayment) {
      debtAmount = totalAmount - paid;
    }

    const change = (paymentMethod === 'CASH' && paid >= totalAmount) ? paid - totalAmount : 0;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: mode,
      timestamp: Date.now(),
      items: [...cart], 
      totalAmount,
      paymentMethod: isDebtInvolved ? 'DEBT' : paymentMethod, 
      amountPaid: paid,
      change,
      partyName: isDebtInvolved ? partyName : undefined
    };

    try {
      await db.saveTransaction(transaction);

      if (isDebtInvolved) {
        await db.saveDebt({
          id: Date.now().toString(),
          type: mode === TransactionType.OUT ? DebtType.RECEIVABLE : DebtType.PAYABLE,
          partyName: partyName,
          amount: debtAmount, 
          description: isPartialPayment 
            ? `Sisa Kurang Bayar (Total: ${totalAmount}, Bayar: ${paid})` 
            : `Transaksi ${mode === TransactionType.OUT ? 'Jual' : 'Restock'} Full Hutang`,
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          isPaid: false,
          createdAt: Date.now()
        });
      }

      setCart([]);
      setIsPaymentModalOpen(false);
      setIsScannerOpen(false); // Close scanner if open
      
      setLastTransaction(transaction);
      
      let msg = '';
      if (mode === TransactionType.IN) {
         msg = 'Restock Berhasil!';
         setSuccessMsg(msg);
         setTimeout(() => setSuccessMsg(''), 3000);
      } else {
         setShowReceipt(true);
      }
      
    } catch (error) {
      alert("Gagal menyimpan transaksi.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setLastTransaction(null);
  };

  const exitRestockMode = () => {
    setMode(TransactionType.OUT);
    setCart([]);
    // Clear history state to avoid sticking to restock mode on refresh/back
    navigate('/pos', { replace: true, state: {} });
  };

  const total = calculateTotal();
  const getCalculationState = () => {
    const paid = parseFloat(amountPaid) || 0;
    const diff = paid - total;
    
    if (diff >= 0) {
      return { status: 'CHANGE', value: diff, label: 'Kembalian' };
    } else {
      return { status: 'DEBT', value: Math.abs(diff), label: 'Kurang (Hutang)' };
    }
  };

  const getPaymentSuggestions = (currentTotal: number) => {
    const suggestions = new Set<number>();
    suggestions.add(currentTotal); 

    const bills = [2000, 5000, 10000, 20000, 50000, 100000];
    
    bills.forEach(bill => {
      if (bill > currentTotal) {
        suggestions.add(bill);
      }
    });

    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
  };
  
  const paymentSuggestions = getPaymentSuggestions(total);
  const calcState = getCalculationState();

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );
  
  const filteredParties = savedParties.filter(p => 
    p.toLowerCase().includes(partyName.toLowerCase())
  );

  const renderPartyInput = (label: string, isRequired: boolean) => (
    <div className="relative">
      <label className="text-sm font-bold text-gray-600 mb-1 block">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input 
          type="text" 
          value={partyName}
          onChange={e => {
            setPartyName(e.target.value);
            setShowPartySuggestions(true);
          }}
          onFocus={() => setShowPartySuggestions(true)}
          onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-secondary z-10"
          placeholder="Ketik nama..."
          autoComplete="off"
        />
        <Users className="absolute left-3 top-3.5 text-gray-400" size={20} />
      </div>

      {showPartySuggestions && partyName.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-xl rounded-lg mt-1 z-50 max-h-48 overflow-y-auto">
          {filteredParties.map((name, idx) => (
            <div 
              key={idx}
              onClick={() => {
                setPartyName(name);
                setShowPartySuggestions(false);
              }}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
            >
              <span className="font-medium text-gray-700">{name}</span>
            </div>
          ))}
          {!filteredParties.includes(partyName) && (
            <div className="px-4 py-3 bg-blue-50 text-blue-700 cursor-pointer font-bold">
              Gunakan Nama Baru: "{partyName}"
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    // Use 100dvh for mobile to respect browser address bars
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-gray-50 md:-m-8">
      
      {/* LEFT COLUMN: PRODUCT LIST (DESKTOP) OR SCANNER AREA */}
      <div className="flex-1 hidden md:flex flex-col border-r border-gray-200 h-full">
        {!isScannerOpen ? (
          <>
            <div className={`p-5 border-b flex gap-4 items-center shadow-sm z-10 ${mode === TransactionType.IN ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Cari nama produk atau scan barcode..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                  // Removed autoFocus to prevent keyboard popup
                />
              </div>
              <button 
                 onClick={() => navigate('/riwayat')}
                 className="bg-white/80 text-gray-600 px-4 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-gray-200 transition-colors"
              >
                <History size={20} />
              </button>
              <button 
                 onClick={() => setIsScannerOpen(true)}
                 className="bg-gray-900 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-gray-800 transition-colors shadow-lg"
              >
                <Scan size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {mode === TransactionType.IN && (
                <div className="mb-4 bg-blue-100 text-blue-800 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                  <span className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> MODE BELANJA STOK</span>
                  <button onClick={exitRestockMode} className="text-xs bg-white/50 hover:bg-white px-2 py-1 rounded-lg font-bold">Kembali ke Kasir</button>
                </div>
              )}
              
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(p => (
                  <div 
                    key={p.barcode}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left flex flex-col h-full cursor-pointer group"
                    onClick={() => addToCart(p)}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-bold uppercase tracking-wide">{p.category}</span>
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>Stok: {p.stock}</span>
                    </div>
                    
                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 mb-auto leading-relaxed">{p.name}</h4>
                    
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-end justify-between">
                      <div>
                         {p.pcsPerCarton && p.pcsPerCarton > 1 && (
                           <p className="text-[10px] text-gray-400 font-bold mb-0.5">1 Dus = {p.pcsPerCarton}</p>
                         )}
                         <p className={`font-bold text-lg ${mode === TransactionType.IN ? 'text-gray-600' : 'text-primary'}`}>
                            Rp {(mode === TransactionType.IN ? p.buyPrice : p.sellPrice).toLocaleString()}
                         </p>
                      </div>
                      {p.pcsPerCarton && p.pcsPerCarton > 1 && (
                        <button 
                          onClick={(e) => {
                             e.stopPropagation();
                             addToCart(p, p.pcsPerCarton);
                          }}
                          className="bg-blue-50 text-blue-600 p-2 rounded-lg text-[10px] font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-100 transition-colors"
                          title={`Tambah 1 Dus (${p.pcsPerCarton} Pcs)`}
                        >
                          <Plus size={12} /> Dus
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                   <Package size={64} className="mx-auto mb-4 opacity-30"/>
                   <p className="text-lg font-medium">Tidak ada produk ditemukan</p>
                   <p className="text-sm">Coba kata kunci lain atau tambah produk baru</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-gray-900 relative">
             <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center text-white z-10">
                <h3 className="font-bold flex items-center gap-2"><Scan size={20} className="text-green-400"/> Mode Scan Aktif</h3>
                <button onClick={() => setIsScannerOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="flex-1 relative">
                <Scanner 
                   isOpen={true} 
                   onScan={handleScan} 
                   onClose={() => setIsScannerOpen(false)} 
                   scanResultMessage={scanFeedback}
                   embedded={true}
                   scannerRegionId="reader-desktop"
                />
             </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: CART & CHECKOUT (MOBILE & DESKTOP) */}
      <div className="w-full md:w-[420px] bg-white flex flex-col h-full shadow-2xl z-20">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className={`md:hidden p-3 border-b shadow-sm z-10 shrink-0 ${mode === TransactionType.IN ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-2">
             <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
               {mode === TransactionType.IN ? 'Belanja Stok' : 'Kasir'}
               {mode === TransactionType.IN && (
                 <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide bg-blue-100 text-blue-700">RESTOCK</span>
               )}
             </div>
             <div className="flex gap-2">
                {mode === TransactionType.IN && (
                  <button onClick={exitRestockMode} className="bg-white border border-gray-200 p-2 rounded-full text-red-500" title="Keluar Mode Restock">
                    <LogOut size={20} />
                  </button>
                )}
                <button onClick={() => navigate('/riwayat')} className="bg-gray-100 p-2 rounded-full text-gray-600">
                  <History size={20} />
                </button>
             </div>
          </div>
          
          {/* Removed Transaction Type Toggle - Default is Sales, Restock triggered from Master Data */}

          <div className="flex gap-2">
            <button 
              onClick={() => setIsScannerOpen(!isScannerOpen)} 
              className={`flex-1 py-2.5 rounded-xl flex justify-center items-center gap-2 font-bold shadow-lg transition-all ${isScannerOpen ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'}`}
            >
              {isScannerOpen ? <X size={18}/> : <Scan size={18}/>} 
              {isScannerOpen ? 'Tutup' : 'Scan'}
            </button>
            <button onClick={() => { setIsSearchModalOpen(true); setSearchQuery(''); }} className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl flex justify-center items-center gap-2 font-bold"><Search size={18}/> Cari</button>
          </div>
        </div>

        {/* Mobile Scanner Embedded Area - Smaller Fixed Height */}
        {isScannerOpen && (
           <div className="w-full h-48 bg-black relative shrink-0 md:hidden border-b-4 border-primary animate-in slide-in-from-top duration-300">
              <Scanner 
                 isOpen={true} 
                 onScan={handleScan} 
                 onClose={() => setIsScannerOpen(false)} 
                 scanResultMessage={scanFeedback}
                 embedded={true}
                 scannerRegionId="reader-mobile"
              />
           </div>
        )}

        {/* Desktop Header for Cart */}
        <div className={`hidden md:flex p-5 border-b items-center justify-between shrink-0 ${mode === TransactionType.IN ? 'bg-blue-50/50' : 'bg-white'}`}>
           <h2 className="font-bold text-xl flex items-center gap-2 text-gray-800">
             <ShoppingCart size={24} className={mode === TransactionType.IN ? "text-blue-600" : "text-primary"}/> 
             {mode === TransactionType.IN ? 'Keranjang Belanja' : 'Keranjang'}
           </h2>
           {mode === TransactionType.IN && (
             <button onClick={exitRestockMode} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-full transition-colors">
               Batal Restock
             </button>
           )}
        </div>

        {/* Cart Items - Flex 1 and overflow auto ensures it takes remaining space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <ShoppingCart size={48} className="opacity-50" />
              </div>
              <p className="font-medium">Keranjang masih kosong</p>
              <p className="text-sm">Scan atau pilih produk untuk memulai</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.barcode} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group animate-in slide-in-from-right-4 duration-300">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm line-clamp-1 mb-1">{item.name}</h4>
                  <p className={`text-xs font-bold ${mode === TransactionType.IN ? 'text-gray-500' : 'text-primary'}`}>
                    @ {(mode === TransactionType.OUT ? item.sellPrice : item.buyPrice).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateQty(item.barcode, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-primary active:scale-90 transition-all"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.barcode, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-primary active:scale-90 transition-all"><Plus size={14} /></button>
                   </div>
                  <button onClick={() => removeItem(item.barcode)} className="text-gray-300 hover:text-red-500 ml-1 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer - Shrink 0 to never collapse */}
        <div className="p-4 md:p-5 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium">{mode === TransactionType.IN ? 'Total Belanja' : 'Total Tagihan'}</span>
            <span className="text-3xl font-bold text-gray-800">Rp {total.toLocaleString()}</span>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handlePrintBill}
              disabled={cart.length === 0}
              className="px-4 py-3 md:px-5 md:py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cetak Tagihan Sementara"
            >
               <FileText size={24} />
            </button>

            <button 
              onClick={openCheckout}
              disabled={cart.length === 0}
              className={`flex-1 py-3 md:py-4 px-6 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed ${
                mode === TransactionType.OUT 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1'
              }`}
            >
              {mode === TransactionType.OUT ? (
                <>
                   <Banknote size={24} /> 
                   <span>Bayar Sekarang</span>
                   <ArrowRight size={24} className="opacity-70" />
                </>
              ) : (
                <>
                   <Package size={24} />
                   <span>Proses Stok</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center md:hidden">
          <div className="bg-white w-full h-[85vh] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b flex gap-3 items-center bg-gray-50 rounded-t-3xl">
              <Search className="text-gray-400" />
              <input 
                // Removed autoFocus
                type="text" 
                placeholder="Ketik nama barang..."
                className="flex-1 outline-none text-lg bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setIsSearchModalOpen(false)} className="p-2 bg-gray-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
              {filteredProducts.map(product => (
                <div 
                  key={product.barcode}
                  className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center text-left active:scale-[0.98] transition-transform"
                  onClick={() => { addToCart(product); setIsSearchModalOpen(false); }}
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                    <div className="flex gap-2 text-xs mt-1 mb-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{product.category}</span>
                      <span className={`${product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>Stok: {product.stock}</span>
                    </div>
                    {product.pcsPerCarton && product.pcsPerCarton > 1 && (
                      <p className="text-[10px] text-blue-600 font-bold">1 Dus = {product.pcsPerCarton} Pcs</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className={`font-bold text-xl ${mode === TransactionType.IN ? 'text-gray-700' : 'text-primary'}`}>
                      Rp {(mode === TransactionType.IN ? product.buyPrice : product.sellPrice).toLocaleString()}
                    </p>
                     {product.pcsPerCarton && product.pcsPerCarton > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, product.pcsPerCarton);
                          setIsSearchModalOpen(false);
                        }}
                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100"
                      >
                        + Dus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (SHARED) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-xl text-gray-800">{mode === TransactionType.OUT ? 'Pembayaran' : 'Konfirmasi Restock'}</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="text-center mb-8">
                <p className="text-gray-500 text-sm font-medium mb-1 uppercase tracking-wide">Total Tagihan</p>
                <p className="text-5xl font-bold text-gray-900 tracking-tight">Rp {total.toLocaleString()}</p>
              </div>

              <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
                <button 
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 min-w-[100px] py-4 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-bold transition-all ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  <Banknote size={24} /> Tunai
                </button>
                <button 
                  onClick={() => { setPaymentMethod('DEBT'); setAmountPaid('0'); }}
                  className={`flex-1 min-w-[100px] py-4 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-bold transition-all ${paymentMethod === 'DEBT' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                >
                  <BookOpen size={24} /> Hutang
                </button>
              </div>

              <div className="space-y-6">
                {mode === TransactionType.OUT && (
                  <>
                    {paymentMethod === 'CASH' && (
                      <>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">Uang Diterima</label>
                          <div className="relative">
                            <span className="absolute left-4 top-4 text-gray-400 font-bold text-lg">Rp</span>
                            <input 
                              // Removed autoFocus to prevent keyboard popup on mobile
                              type="number" 
                              value={amountPaid}
                              onChange={e => setAmountPaid(e.target.value)}
                              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                              placeholder="0"
                            />
                          </div>
                          
                          {/* QUICK MONEY SUGGESTIONS */}
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                             {paymentSuggestions.map(amount => (
                               <button
                                 key={amount}
                                 onClick={() => setAmountPaid(amount.toString())}
                                 className="px-4 py-2 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 transition-all whitespace-nowrap flex-shrink-0 shadow-sm"
                               >
                                 {amount === total ? 'Uang Pas' : `Rp ${amount.toLocaleString()}`}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className={`p-5 rounded-2xl flex justify-between items-center border-2 ${calcState.status === 'CHANGE' ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                          <span className={`font-bold ${calcState.status === 'CHANGE' ? 'text-emerald-700' : 'text-orange-700'}`}>{calcState.label}</span>
                          <span className={`text-2xl font-bold ${calcState.status === 'CHANGE' ? 'text-emerald-700' : 'text-orange-700'}`}>Rp {calcState.value.toLocaleString()}</span>
                        </div>

                        {calcState.status === 'DEBT' && (
                           <div className="animate-in fade-in slide-in-from-top-2 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                             {renderPartyInput('Nama Pelanggan', true)}
                          </div>
                        )}
                      </>
                    )}

                    {paymentMethod === 'DEBT' && (
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        {renderPartyInput('Nama Pelanggan', true)}
                      </div>
                    )}
                  </>
                )}

                {mode === TransactionType.IN && (
                  <>
                     {paymentMethod === 'CASH' ? (
                       <div className="bg-gray-50 border border-gray-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                         <div className="p-3 bg-green-100 rounded-full text-green-600 mb-2">
                            <CheckCircle size={32} />
                         </div>
                         <h3 className="font-bold text-gray-800 text-lg">Pembayaran Lunas</h3>
                         <p className="text-sm text-gray-500">
                            Metode: <span className="font-bold text-gray-700">Tunai</span>
                         </p>
                       </div>
                     ) : (
                       <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                          {renderPartyInput('Nama Supplier', true)}
                       </div>
                     )}
                  </>
                )}

                <button 
                  onClick={handleConfirmPayment}
                  disabled={isProcessingPayment}
                  className={`w-full py-5 mt-4 rounded-2xl text-white font-bold text-xl shadow-xl flex justify-center items-center gap-3 transition-transform active:scale-[0.98] ${
                     ((paymentMethod === 'CASH') && (mode === TransactionType.IN || calcState.status === 'CHANGE')) 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200' 
                      : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200'
                  }`}
                >
                  {isProcessingPayment ? <Loader2 className="animate-spin" /> : 'Konfirmasi Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Printable Area */}
            <div id="receipt-area" className="font-mono text-sm">
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-300">
                <h2 className="font-bold text-xl uppercase tracking-wider mb-1">WarungPintar</h2>
                {lastTransaction.id === 'DRAFT' && (
                  <div className="border border-dashed border-gray-400 px-2 py-1 inline-block text-xs font-bold my-1">
                    ESTIMASI / BILL
                  </div>
                )}
                <p className="text-xs text-gray-500">Jl. Raya Warung No. 1</p>
                <p className="text-xs text-gray-500">Telp: 0812-3456-7890</p>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{new Date(lastTransaction.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span>ID: {lastTransaction.id === 'DRAFT' ? 'DRAFT' : lastTransaction.id.slice(-6)}</span>
              </div>

              {lastTransaction.partyName && (
                <div className="mb-2 text-xs">
                   Pelanggan: <span className="font-bold">{lastTransaction.partyName}</span>
                </div>
              )}

              {/* ITEM LIST */}
              <div className="border-t border-dashed border-gray-300 py-2 mb-2">
                {lastTransaction.items.map((item, index) => (
                   <div key={index} className="flex flex-col mb-2 border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0 last:mb-0">
                     <span className="font-bold text-gray-800">{item.name}</span>
                     <div className="flex justify-between items-center text-xs mt-0.5">
                        <span className="text-gray-500">
                          {item.quantity} x {(lastTransaction.type === TransactionType.OUT ? item.sellPrice : item.buyPrice).toLocaleString()}
                        </span>
                        <span className="font-bold text-gray-800">
                           {(item.quantity * (lastTransaction.type === TransactionType.OUT ? item.sellPrice : item.buyPrice)).toLocaleString()}
                        </span>
                     </div>
                   </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>Rp {lastTransaction.totalAmount.toLocaleString()}</span>
                </div>
                {lastTransaction.id !== 'DRAFT' && lastTransaction.paymentMethod === 'CASH' && (
                  <>
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>Tunai</span>
                       <span>Rp {lastTransaction.amountPaid.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-xs text-gray-500">
                       <span>Kembali</span>
                       <span>Rp {lastTransaction.change.toLocaleString()}</span>
                     </div>
                     {lastTransaction.totalAmount > lastTransaction.amountPaid && (
                       <div className="flex justify-between text-xs text-orange-600 font-bold mt-1">
                         <span>Kurang (Hutang)</span>
                         <span>Rp {(lastTransaction.totalAmount - lastTransaction.amountPaid).toLocaleString()}</span>
                       </div>
                     )}
                  </>
                )}
                {lastTransaction.id !== 'DRAFT' && lastTransaction.paymentMethod === 'DEBT' && (
                  <div className="text-center text-xs bg-gray-100 p-1 rounded mt-2">
                    Transaksi Masuk Hutang
                  </div>
                )}
              </div>

              <div className="text-center mt-6 text-xs text-gray-400">
                <p>Terima kasih sudah berbelanja!</p>
                <p>Barang yang dibeli tidak dapat ditukar.</p>
              </div>
            </div>

            {/* Actions (Hidden on Print) */}
            <div className="mt-6 flex gap-3 print:hidden">
              <button 
                onClick={handlePrintReceipt} 
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg"
              >
                <Printer size={18} /> Print
              </button>
              <button 
                onClick={handleCloseReceipt} 
                className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200"
              >
                Tutup
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

      {successMsg && !showReceipt && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur text-white px-8 py-6 rounded-3xl flex flex-col items-center gap-3 shadow-2xl animate-in zoom-in duration-200">
            <div className="p-3 bg-green-500 rounded-full text-white">
              <CheckCircle className="w-10 h-10" />
            </div>
            <span className="text-2xl font-bold text-center tracking-tight">{successMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};