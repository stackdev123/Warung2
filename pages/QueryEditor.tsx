import React, { useState } from 'react';
import { supabase } from '../services/db';
import { Play, Database, Trash2, AlertTriangle, Table } from 'lucide-react';

export const QueryEditor: React.FC = () => {
  const [query, setQuery] = useState('SELECT * FROM products LIMIT 10');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const TABLES = ['products', 'transactions', 'transaction_items', 'debts'];

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    const q = query.trim();
    const lowerQ = q.toLowerCase();

    // SIMPLE SQL PARSER FOR SUPABASE CLIENT
    // Since we can't run RAW SQL from client without RPC, we map it to supabase-js
    try {
      if (!lowerQ.startsWith('select')) {
         throw new Error("Mode Klien hanya mendukung perintah SELECT demi keamanan.");
      }

      // Regex untuk ekstrak nama tabel: FROM table_name
      const fromMatch = q.match(/from\s+([a-z0-9_]+)/i);
      if (!fromMatch) {
         throw new Error("Tabel tidak ditentukan (Gunakan: SELECT * FROM nama_tabel)");
      }
      const tableName = fromMatch[1];

      // Regex untuk LIMIT
      const limitMatch = q.match(/limit\s+(\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 100;

      // Regex untuk ORDER BY column ASC/DESC
      const orderMatch = q.match(/order by\s+([a-z0-9_]+)\s*(asc|desc)?/i);
      
      // Regex untuk WHERE sederhana (col = 'val' atau col = val)
      // Note: Ini parser sangat sederhana
      const whereMatch = q.match(/where\s+([a-z0-9_]+)\s*=\s*['"]?([^'"]+)['"]?/i);

      // Build Query
      let queryBuilder = supabase.from(tableName).select('*');

      if (whereMatch) {
         queryBuilder = queryBuilder.eq(whereMatch[1], whereMatch[2]);
      }

      if (orderMatch) {
         queryBuilder = queryBuilder.order(orderMatch[1], { ascending: orderMatch[2]?.toLowerCase() !== 'desc' });
      }

      const { data, error: sbError } = await queryBuilder.limit(limit);

      if (sbError) throw sbError;
      setResults(data);

    } catch (err: any) {
      setError(err.message || "Gagal menjalankan query.");
    } finally {
      setLoading(false);
    }
  };

  const insertTable = (t: string) => {
    setQuery(`SELECT * FROM ${t} LIMIT 10`);
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen pb-20">
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <Database className="text-primary"/> SQL Playground
         </h1>
         <p className="text-gray-500 text-sm">Jalankan query sederhana untuk melihat data mentah database.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SIDEBAR TABLE LIST */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase"><Table size={14}/> Tabel Tersedia</h3>
              <ul className="space-y-2">
                {TABLES.map(t => (
                  <li key={t}>
                    <button 
                      onClick={() => insertTable(t)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary rounded-lg font-mono transition-colors flex justify-between group"
                    >
                      {t}
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-gray-200 px-1 rounded">Insert</span>
                    </button>
                  </li>
                ))}
              </ul>
           </div>
           
           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">
             <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Info Keamanan</p>
             <p>Fitur ini mensimulasikan SQL Editor. Hanya perintah <b>SELECT</b> yang diizinkan di mode klien ini.</p>
           </div>
        </div>

        {/* EDITOR AREA */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700">
              <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                 <span className="text-gray-400 text-xs font-mono">Query Editor</span>
                 <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white transition-colors"><Trash2 size={14}/></button>
              </div>
              <textarea 
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-40 bg-gray-900 text-green-400 font-mono p-4 outline-none resize-y text-sm leading-relaxed"
                spellCheck={false}
              />
              <div className="bg-gray-800 px-4 py-3 flex justify-end">
                 <button 
                   onClick={executeQuery}
                   disabled={loading}
                   className="bg-primary hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                 >
                   <Play size={16} fill="currentColor" /> {loading ? 'Running...' : 'Run Query'}
                 </button>
              </div>
           </div>

           {/* ERROR MESSAGE */}
           {error && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-mono text-sm animate-in slide-in-from-top-2">
                <span className="font-bold">Error:</span> {error}
             </div>
           )}

           {/* RESULTS TABLE */}
           {results && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                   <h3 className="font-bold text-gray-700 text-sm">Hasil Query</h3>
                   <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{results.length} baris ditemukan</span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-mono">
                       <tr>
                         {results.length > 0 && Object.keys(results[0]).map(key => (
                           <th key={key} className="px-4 py-3 whitespace-nowrap">{key}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 font-mono text-xs">
                        {results.length === 0 ? (
                          <tr><td className="p-4 text-center text-gray-400 italic">Tidak ada data.</td></tr>
                        ) : (
                          results.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                               {Object.values(row).map((val: any, i) => (
                                 <td key={i} className="px-4 py-2 whitespace-nowrap max-w-[200px] truncate">
                                   {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                                 </td>
                               ))}
                            </tr>
                          ))
                        )}
                     </tbody>
                   </table>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};