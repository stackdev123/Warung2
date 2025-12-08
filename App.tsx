
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, DollarSign, Store, History, Loader2, Settings, X, Palette, Check } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { MasterData } from './pages/MasterData';
import { POS } from './pages/POS';
import { Finance } from './pages/Finance';
import { History as HistoryPage } from './pages/History';
import { db } from './services/db';

const THEMES = [
  { id: 'emerald', name: 'Emerald', color: '5 150 105', hex: '#059669' },
  { id: 'blue', name: 'Blue', color: '37 99 235', hex: '#2563eb' },
  { id: 'violet', name: 'Violet', color: '124 58 237', hex: '#7c3aed' },
  { id: 'rose', name: 'Rose', color: '225 29 72', hex: '#e11d48' },
  { id: 'orange', name: 'Orange', color: '234 88 12', hex: '#ea580c' },
  { id: 'sky', name: 'Sky', color: '2 132 199', hex: '#0284c7' },
];

const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group ${
          isActive 
            ? 'bg-primary/10 text-primary font-bold' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className={isActive ? "text-primary fill-primary/20" : "text-gray-400 group-hover:text-gray-600"} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
};

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-primary font-bold' : 'text-gray-400'}`}>
    <Icon size={24} />
    <span className="text-[10px]">{label}</span>
  </NavLink>
);

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const isPos = location.pathname === '/pos';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('emerald');

  useEffect(() => {
    // Load saved theme
    const savedTheme = db.getTheme();
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.color);
      db.saveTheme(themeId);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed h-full z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-2.5 rounded-xl text-white shadow-lg shadow-primary/30">
              <Store size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-800 tracking-tight leading-none">WarungPintar</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1 uppercase">v2.0 Pro</p>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1 flex-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/pos" icon={ShoppingCart} label="Kasir / POS" />
          <NavItem to="/stok" icon={Package} label="Data Stok" />
          <NavItem to="/keuangan" icon={DollarSign} label="Keuangan" />
          <NavItem to="/riwayat" icon={History} label="Riwayat" />
        </nav>

        <div className="p-4 border-t border-gray-50">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
           >
             <Settings size={20} />
             <span className="font-bold text-sm">Pengaturan</span>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 md:ml-64 transition-all duration-300 ${isPos ? 'p-0' : 'p-4 md:p-8'} mb-20 md:mb-0 h-screen overflow-y-auto scroll-smooth`}>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (MOBILE) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around py-3 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <MobileNavItem to="/" icon={LayoutDashboard} label="Beranda" />
        <MobileNavItem to="/stok" icon={Package} label="Stok" />
        <div className="relative -top-8">
          <NavLink to="/pos" className={({ isActive }) => `flex items-center justify-center w-16 h-16 rounded-full shadow-xl border-4 border-gray-50 transition-transform active:scale-95 ${isActive ? 'bg-primary text-white shadow-primary/40' : 'bg-gray-900 text-white'}`}>
            <ShoppingCart size={26} />
          </NavLink>
        </div>
        <MobileNavItem to="/keuangan" icon={DollarSign} label="Keuangan" />
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-gray-400"
        >
          <Settings size={24} />
          <span className="text-[10px]">Setelan</span>
        </button>
      </nav>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Settings className="text-primary" size={24}/> Pengaturan
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-600 mb-3 block flex items-center gap-2">
                  <Palette size={18}/> Tema Warna Aplikasi
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => applyTheme(theme.id)}
                      className={`h-12 rounded-xl border-2 flex items-center justify-center transition-all ${currentTheme === theme.id ? 'border-gray-800 scale-105 shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: theme.hex }}
                    >
                      {currentTheme === theme.id && <Check className="text-white" size={20} />}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                  {THEMES.find(t => t.id === currentTheme)?.name} Selected
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <p className="text-center text-xs text-gray-400">WarungPintar App v2.1</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulasi init
    setTimeout(() => {
        setIsReady(true);
    }, 500);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="animate-spin mb-4 text-primary" size={48} />
        <p className="font-bold text-gray-800">Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stok" element={<MasterData />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/keuangan" element={<Finance />} />
          <Route path="/riwayat" element={<HistoryPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
