import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { Scanner } from '../components/Scanner';
import { Search, Plus, Trash2, Edit2, Box, X, PackageOpen, Tag, Loader2, Keyboard, ScanBarcode, Layers, AlertCircle, Filter, ArrowUpRight, ArrowDownLeft, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MasterData: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [focusField, setFocusField] = useState<'barcode' | 'name' | 'stock'>('name');

  // Input states for Dus/Pcs to separate UI from logic
  const [dusValue, setDusValue] = useState<string>('');
  const [pcsValue, setPcsValue] = useState<string>('');

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW'>('ALL');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  // Removed useEffect for autoFocus on modal open to prevent keyboard popup
  // Users should tap to focus

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
    const newProd = { 
      barcode, 
      name: '', 
      category: categoryFilter !== 'Semua' ? categoryFilter : 'Lainnya', 
      buyPrice: 0, 
      sellPrice: 0, 
      stock: 0,
      pcsPerCarton: 1
    };
    setEditingProduct(newProd);
    
    // Init local inputs
    setDusValue('');
    setPcsValue('');

    setFocusField(barcode ? 'name' : 'barcode');
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    
    // Init local inputs
    const { dus, pcs } = getStockBreakdown(product.stock, product.pcsPerCarton || 1);
    setDusValue(dus === 0 ? '' : dus.toString());
    setPcsValue(pcs === 0 ? '' : pcs.toString());

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

  const goToRestockMode = () => {
    // Navigate to POS with State to trigger Restock Mode
    navigate('/pos', { state: { mode: 'MASUK' } });
  };

  // Helper untuk menghitung Dus dan Pcs Sisa
  const getStockBreakdown = (stock: number, pcsPerCarton: number) => {
    const dus = Math.floor(stock / (pcsPerCarton || 1));
    const pcs = stock % (pcsPerCarton || 1);
    return { dus, pcs };
  };

  const updateStockFromInputs = (newDusVal: string, newPcsVal: string) => {
    if (!editingProduct) return;
    const d = parseInt(newDusVal) || 0;
    const p = parseInt(newPcsVal) || 0;
    const total = (d * (editingProduct.pcsPerCarton || 1)) + p;
    setEditingProduct(prev => prev ? ({ ...prev, stock: total }) : null);
  };

  // Unique Categories for Filter
  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category))).sort()];

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCategory = categoryFilter === 'Semua' || p.category === categoryFilter;
    const matchesStock = stockFilter === 'ALL' || (stockFilter === 'LOW' && p.stock < 5);
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Manajemen Stok</h1>
           <p className="text-gray-500 text-sm font-medium">Kelola database produk dan harga</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={goToRestockMode}
            className="flex-1 md:flex-none bg-blue-600 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 transition-all shadow-lg text-sm whitespace-nowrap"
          >
            <ShoppingCart size={18} />
            Belanja Stok
          </button>
          <button 
            onClick={() => handleAdd('')}
            className="flex-1 md:flex-none bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-50 transition-all shadow-sm text-sm whitespace-nowrap"
          >
            <Keyboard size={18} />
            Input Baru
          </button>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 md:flex-none bg-gray-900 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg hover:bg-gray-800 transition-all text-sm whitespace-nowrap"
          >
            <ScanBarcode size={18} />
            Scan
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama produk atau kode barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-primary focus:bg-white bg-white outline-none text-lg transition-all"
            // Removed autoFocus
          />
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white p-2 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto px-1">
             <Filter size={18} className="text-gray-400 flex-shrink-0 ml-1 mr-1" />
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setCategoryFilter(cat)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                   categoryFilter === cat 
                     ? 'bg-gray-900 text-white shadow-md' 
                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                 }`}
               >
                 {cat}
               </button>
             ))}
          </div>
          
          <div className="border-t md:border-t-0 md:border-l border-gray-100 w-full md:w-auto pt-2 md:pt-0 md:pl-3 flex items-center">
            <button
               onClick={() => setStockFilter(stockFilter === 'ALL' ? 'LOW' : 'ALL')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-full md:w-auto justify-center ${
                 stockFilter === 'LOW' 
                   ? 'bg-red-100 text-red-600 border border-red-200' 
                   : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
               }`}
            >
              <AlertCircle size={14} />
              {stockFilter === 'LOW' ? 'Menampilkan Stok Menipis' : 'Tampilkan Stok Menipis'}
            </button>
          </div>
        </div>
      </div>

      {loadingData && !isModalOpen && (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-primary" size={32} />
          <p className="text-sm text-gray-500 mt-2 font-medium">Memuat data produk...</p>
        </div>
      )}

      {!loadingData && (
        <>
          <div className="flex justify-between items-center px-1">
            <p className="text-sm text-gray-500 font-medium">
              Menampilkan {filteredProducts.length} produk
              {stockFilter === 'LOW' && <span className="text-red-500 font-bold ml-1">(Mode Stok Menipis)</span>}
            </p>
          </div>

          {/* TABLE VIEW (DESKTOP) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Nama Produk</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4 text-right">Harga Beli</th>
                    <th className="px-6 py-4 text-right">Harga Jual</th>
                    <th className="px-6 py-4 text-center">Stok</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <tr 
                      key={p.barcode} 
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => { setFocusField('stock'); handleEdit(p); }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                          <span className="text-xs text-gray-400 font-mono">{p.barcode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-500 font-medium text-sm">Rp {p.buyPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-600 font-bold text-sm">Rp {p.sellPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                           {p.stock}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setFocusField('name'); handleEdit(p); }}
                              className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(p.barcode); }}
                              className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LIST VIEW (MOBILE) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map(p => (
              <div 
                key={p.barcode} 
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-[0.99] transition-transform"
                onClick={() => { setFocusField('stock'); handleEdit(p); }}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase font-bold tracking-wider">{p.category}</span>
                   </div>
                   {p.stock < 5 && (
                     <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                       <AlertCircle size={10} /> Stok Rendah
                     </div>
                   )}
                </div>

                <div className="flex justify-between items-center mb-3">
                  <div className="flex-1 pr-4">
                     <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{p.name}</h3>
                     <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.barcode}</p>
                  </div>
                  <div className="text-center px-3 py-1 bg-gray-50 rounded-lg">
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Stok</p>
                     <p className={`font-bold text-lg leading-none ${p.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                   <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400">Harga Beli</p>
                        <p className="text-xs font-medium text-gray-600">Rp {p.buyPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Harga Jual</p>
                        <p className="text-xs font-bold text-emerald-600">Rp {p.sellPrice.toLocaleString()}</p>
                      </div>
                   </div>
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.barcode); }}
                      className="p-2 text-gray-300 hover:text-red-500 rounded-full"
                    >
                      <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loadingData && filteredProducts.length === 0 && (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Box size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold text-gray-600">Produk tidak ditemukan.</p>
          <p className="text-sm">Coba ubah filter atau kata kunci pencarian.</p>
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
                  // Removed autoFocus
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
                        value={dusValue} 
                        onChange={e => {
                          const val = e.target.value;
                          setDusValue(val);
                          updateStockFromInputs(val, pcsValue);
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
                        value={pcsValue} 
                        onChange={e => {
                           const val = e.target.value;
                           setPcsValue(val);
                           updateStockFromInputs(dusValue, val);
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
                 <div className="grid grid-cols-2 gap-2">
                   {['Makanan', 'Minuman', 'Sembako', 'Kebersihan', 'Rokok', 'Obat-obatan', 'Lainnya'].map(cat => (
                     <button
                       key={cat}
                       type="button"
                       onClick={() => setEditingProduct({...editingProduct, category: cat})}
                       className={`p-2 rounded-lg text-sm font-medium border transition-all ${
                         editingProduct.category === cat 
                           ? 'bg-primary text-white border-primary shadow-sm' 
                           : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
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