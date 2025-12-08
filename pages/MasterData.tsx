import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { Scanner } from '../components/Scanner';
import { Search, Plus, Trash2, Edit2, Box, X, PackageOpen, Tag, Loader2, Keyboard, ScanBarcode, Layers, AlertCircle } from 'lucide-react';

export const MasterData: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [focusField, setFocusField] = useState<'barcode' | 'name' | 'stock'>('name');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        if (focusField === 'barcode' && barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        } else if (focusField === 'name' && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (focusField === 'stock' && stockInputRef.current) {
          stockInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, focusField]);

  const loadProducts = async () => {
    setLoadingData(true);
    const data = await db.getProducts();
    setProducts(data);
    setLoadingData(false);
  };

  const handleScan = (code: string) => {
    setIsScannerOpen(false);
    const existing = products.find(p => p.barcode === code);
    
    if (existing) {
      setFocusField('stock');
      handleEdit(existing);
    } else {
      setFocusField('name');
      handleAdd(code);
    }
  };

  const handleAdd = (barcode: string = '') => {
    setEditingProduct({ 
      barcode, 
      name: '', 
      category: 'Lainnya', 
      buyPrice: 0, 
      sellPrice: 0, 
      stock: 0,
      pcsPerCarton: 1
    });
    setFocusField(barcode ? 'name' : 'barcode');
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = async (barcode: string) => {
    if (confirm('Hapus produk ini?')) {
      setLoadingData(true);
      await db.deleteProduct(barcode);
      await loadProducts();
      setLoadingData(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && editingProduct.barcode && editingProduct.name) {
      setLoadingData(true);
      await db.saveProduct(editingProduct as Product);
      setIsModalOpen(false);
      await loadProducts();
    } else {
      alert("Kode Barcode dan Nama Produk wajib diisi!");
    }
  };

  // Helper untuk menghitung Dus dan Pcs Sisa
  const getStockBreakdown = (stock: number, pcsPerCarton: number) => {
    const dus = Math.floor(stock / (pcsPerCarton || 1));
    const pcs = stock % (pcsPerCarton || 1);
    return { dus, pcs };
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Stok Barang</h1>
           <p className="text-gray-500 text-sm font-medium">{products.length} Item terdaftar dalam database</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleAdd('')}
            className="flex-1 md:flex-none bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-50 transition-all shadow-sm text-sm"
          >
            <Keyboard size={18} />
            Input Manual
          </button>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 md:flex-none bg-gray-900 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg hover:bg-gray-800 transition-all text-sm"
          >
            <ScanBarcode size={18} />
            Scan Barcode
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama produk atau kode barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-primary focus:bg-white bg-gray-50 outline-none text-lg transition-all"
        />
      </div>

      {loadingData && !isModalOpen && (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-primary" size={32} />
          <p className="text-sm text-gray-500 mt-2 font-medium">Memuat data produk...</p>
        </div>
      )}

      {/* CONTAINER UTAMA: List di Mobile (bg-white unified), Grid di Desktop (bg-transparent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-5 bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-sm md:shadow-none border md:border-none border-gray-100 divide-y md:divide-y-0 divide-gray-100 overflow-hidden md:overflow-visible">
        {!loadingData && filteredProducts.map(p => (
          <div key={p.barcode} className="group relative p-4 md:p-5 md:bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 md:hover:shadow-lg md:hover:-translate-y-1 transition-all">
            
            {/* Colored Top Border for Desktop */}
            <div className="hidden md:block absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl"></div>

            {/* TAMPILAN MOBILE (Compact List Row) */}
            <div className="flex md:hidden justify-between items-center">
               <div className="flex-1 min-w-0 pr-3 cursor-pointer" onClick={() => { setFocusField('stock'); handleEdit(p); }}>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase font-bold tracking-wider">{p.category}</span>
                     {p.stock < 5 && <AlertCircle size={14} className="text-red-500" />}
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm truncate">{p.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                     <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Rp {p.sellPrice.toLocaleString()}</span>
                  </div>
               </div>

               <div className="flex items-center gap-3 border-l pl-3 border-gray-100">
                  <div className="text-right cursor-pointer" onClick={() => { setFocusField('stock'); handleEdit(p); }}>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Stok</p>
                     <p className={`font-bold text-lg leading-none ${p.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock}</p>
                  </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.barcode); }} 
                    className="p-2 text-gray-300 hover:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
               </div>
            </div>

            {/* TAMPILAN DESKTOP (Full Card) */}
            <div className="hidden md:block pt-2">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                  {p.category}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setFocusField('stock'); handleEdit(p); }} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.barcode)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 line-clamp-2 h-12">{p.name}</h3>
              <p className="text-xs text-gray-400 font-mono mb-4">{p.barcode}</p>
              
              <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Jual</p>
                  <p className="font-bold text-gray-900 text-sm">Rp {p.sellPrice.toLocaleString()}</p>
                </div>
                <div className={`p-2 rounded-lg ${p.stock < 5 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className={`text-[10px] uppercase font-bold mb-1 ${p.stock < 5 ? 'text-red-400' : 'text-emerald-400'}`}>Stok</p>
                  <p className={`font-bold text-xl leading-none ${p.stock < 5 ? 'text-red-600' : 'text-emerald-600'}`}>{p.stock}</p>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {!loadingData && filteredProducts.length === 0 && (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Box size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold text-gray-600">Produk tidak ditemukan.</p>
          <p className="text-sm">Scan barcode atau klik Input Manual untuk menambah.</p>
        </div>
      )}

      <Scanner 
        isOpen={isScannerOpen} 
        onScan={handleScan} 
        onClose={() => setIsScannerOpen(false)} 
      />

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-in zoom-in duration-200">
            <div className="p-5 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {products.find(p => p.barcode === editingProduct.barcode) ? 'Update Produk' : 'Produk Baru'}
                </h2>
                {editingProduct.barcode && <p className="text-xs font-mono text-gray-500 mt-1">{editingProduct.barcode}</p>}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                   Kode Barcode / ID
                </label>
                <input 
                  ref={barcodeInputRef}
                  type="text"
                  value={editingProduct.barcode}
                  onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})}
                  className={`w-full p-4 border-2 rounded-xl text-lg font-mono ${
                    products.find(p => p.barcode === editingProduct.barcode) 
                      ? 'bg-gray-100 border-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'border-gray-200 focus:border-primary focus:outline-none'
                  }`}
                  placeholder="Scan atau ketik kode unik..."
                  disabled={!!products.find(p => p.barcode === editingProduct.barcode && editingProduct.barcode !== '')}
                  required
                />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                    Nama Produk
                  </label>
                  <input 
                    ref={nameInputRef}
                    type="text" 
                    value={editingProduct.name} 
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-lg font-bold text-gray-800"
                    placeholder="Contoh: Indomie Goreng"
                    required
                  />
                </div>

                {/* LOGIC STOK BARU: INPUT DUS & PCS */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="mb-4">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                        Konfigurasi Kemasan
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={editingProduct.pcsPerCarton === 0 ? '' : editingProduct.pcsPerCarton} 
                          onChange={e => {
                             const newSize = parseInt(e.target.value) || 1;
                             setEditingProduct({...editingProduct, pcsPerCarton: newSize});
                          }}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-xl font-bold text-gray-800 placeholder-gray-300"
                          placeholder="1"
                        />
                        <span className="absolute right-4 top-5 text-xs text-gray-400 font-bold uppercase">Isi Pcs / Dus</span>
                      </div>
                  </div>

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                    Stok Fisik (Otomatis Hitung Total)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={getStockBreakdown(editingProduct.stock || 0, editingProduct.pcsPerCarton || 1).dus} 
                        onChange={e => {
                          const newDus = parseInt(e.target.value) || 0;
                          const currentPcs = (editingProduct.stock || 0) % (editingProduct.pcsPerCarton || 1);
                          const newTotal = (newDus * (editingProduct.pcsPerCarton || 1)) + currentPcs;
                          setEditingProduct({...editingProduct, stock: newTotal});
                        }}
                        className="w-full pl-4 pr-12 p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-4 text-xs font-bold text-gray-400">DUS</span>
                    </div>
                    <div className="relative">
                      <input 
                        ref={stockInputRef}
                        type="number" 
                        value={getStockBreakdown(editingProduct.stock || 0, editingProduct.pcsPerCarton || 1).pcs} 
                        onChange={e => {
                          const newPcs = parseInt(e.target.value) || 0;
                          const currentDus = Math.floor((editingProduct.stock || 0) / (editingProduct.pcsPerCarton || 1));
                          const newTotal = (currentDus * (editingProduct.pcsPerCarton || 1)) + newPcs;
                          setEditingProduct({...editingProduct, stock: newTotal});
                        }}
                        className="w-full pl-4 pr-12 p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-4 text-xs font-bold text-gray-400">PCS</span>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                     <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                       Total Tersimpan: {editingProduct.stock} Pcs
                     </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Harga Beli (Pcs)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={editingProduct.buyPrice === 0 ? '' : editingProduct.buyPrice} 
                      onChange={e => setEditingProduct({...editingProduct, buyPrice: parseInt(e.target.value) || 0})}
                      className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-300 font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Harga Jual (Pcs)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={editingProduct.sellPrice === 0 ? '' : editingProduct.sellPrice} 
                      onChange={e => setEditingProduct({...editingProduct, sellPrice: parseInt(e.target.value) || 0})}
                      className="w-full pl-10 p-3 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-emerald-200"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Kategori</label>
                 <select 
                   value={editingProduct.category} 
                   onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                   className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none font-medium"
                 >
                   <option>Makanan</option>
                   <option>Minuman</option>
                   <option>Sembako</option>
                   <option>Kebersihan</option>
                   <option>Rokok</option>
                   <option>Obat-obatan</option>
                   <option>Lainnya</option>
                 </select>
              </div>

              <button 
                type="submit" 
                disabled={loadingData}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-black transition-all mt-2 flex justify-center items-center gap-2"
              >
                {loadingData ? <Loader2 className="animate-spin" /> : 'Simpan Data'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};