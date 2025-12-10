

import { createClient } from '@supabase/supabase-js';
import { Product, Transaction, DebtRecord, TransactionType, DebtType, ShopStats, LedgerEntry, TopProduct } from '../types';

// KONFIGURASI SUPABASE
// Menggunakan Key secara langsung sesuai permintaan untuk memastikan koneksi stabil
const SUPABASE_URL = 'https://vqmfbnqjrdyijnpaywug.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-MgxWwIiJHBhq1594eIdrw_NUSZKpQc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KEYS = {
  THEME: 'wp_theme_color'
};

export const db = {
  // --- THEME (Tetap di LocalStorage agar cepat load UI) ---
  getTheme: (): string => {
    return localStorage.getItem(KEYS.THEME) || 'emerald';
  },

  saveTheme: (colorName: string) => {
    localStorage.setItem(KEYS.THEME, colorName);
  },

  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    // Map snake_case (DB) to camelCase (App)
    return data.map((p: any) => ({
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      buyPrice: Number(p.buy_price),
      sellPrice: Number(p.sell_price),
      stock: p.stock,
      pcsPerCarton: p.pcs_per_carton
    }));
  },

  saveProduct: async (product: Product) => {
    // Map camelCase to snake_case
    const dbProduct = {
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      buy_price: product.buyPrice,
      sell_price: product.sellPrice,
      stock: product.stock,
      pcs_per_carton: product.pcsPerCarton
    };

    const { error } = await supabase
      .from('products')
      .upsert(dbProduct);

    if (error) console.error('Error saving product:', error);
  },

  deleteProduct: async (barcode: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('barcode', barcode);

    if (error) console.error('Error deleting product:', error);
  },

  // --- TRANSACTIONS ---
  getTransactions: async (): Promise<Transaction[]> => {
    // Fetch Header + Items
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (*)
      `)
      .order('timestamp', { ascending: false }); // Sort terbaru

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    // Map DB structure to App structure
    return data.map((t: any) => ({
      id: t.id,
      type: t.type as TransactionType,
      timestamp: Number(t.timestamp),
      totalAmount: Number(t.total_amount),
      subtotal: t.subtotal ? Number(t.subtotal) : Number(t.total_amount), // Fallback
      discount: t.discount ? Number(t.discount) : 0,
      paymentMethod: t.payment_method,
      amountPaid: Number(t.amount_paid),
      change: Number(t.change),
      partyName: t.party_name,
      note: t.note,
      items: t.transaction_items.map((i: any) => ({
        barcode: i.barcode,
        name: i.name,
        category: i.category,
        buyPrice: Number(i.buy_price),
        sellPrice: Number(i.sell_price),
        quantity: i.quantity
      }))
    }));
  },

  getTransactionHistory: async (page: number = 1, limit: number = 20, filterDate: string = ''): Promise<{ data: Transaction[], hasMore: boolean }> => {
    // Basic pagination logic
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let queryBuilder = supabase
      .from('transactions')
      .select(`*, transaction_items (*)`, { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(start, end);

    if (filterDate) {
      // Filter by Date (00:00 to 23:59)
      const dateObj = new Date(filterDate);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0)).getTime();
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999)).getTime();
      
      queryBuilder = queryBuilder
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Error fetching history:', error);
      return { data: [], hasMore: false };
    }

    const transactions = data.map((t: any) => ({
      id: t.id,
      type: t.type as TransactionType,
      timestamp: Number(t.timestamp),
      totalAmount: Number(t.total_amount),
      subtotal: t.subtotal ? Number(t.subtotal) : Number(t.total_amount),
      discount: t.discount ? Number(t.discount) : 0,
      paymentMethod: t.payment_method,
      amountPaid: Number(t.amount_paid),
      change: Number(t.change),
      partyName: t.party_name,
      note: t.note,
      items: t.transaction_items.map((i: any) => ({
        barcode: i.barcode,
        name: i.name,
        category: i.category,
        buyPrice: Number(i.buy_price),
        sellPrice: Number(i.sell_price),
        quantity: i.quantity
      }))
    }));

    const hasMore = (count || 0) > (page * limit);
    return { data: transactions, hasMore };
  },

  saveTransaction: async (transaction: Transaction) => {
    // 1. Insert Header
    const dbTransaction = {
      id: transaction.id,
      type: transaction.type,
      timestamp: transaction.timestamp,
      total_amount: transaction.totalAmount,
      subtotal: transaction.subtotal || transaction.totalAmount,
      discount: transaction.discount || 0,
      note: transaction.note,
      payment_method: transaction.paymentMethod,
      amount_paid: transaction.amountPaid,
      change: transaction.change,
      party_name: transaction.partyName
    };

    const { error: txError } = await supabase.from('transactions').insert(dbTransaction);
    if (txError) {
      console.error('Error saving transaction header:', txError);
      throw txError;
    }

    // 2. Insert Items (Batch)
    if (transaction.items.length > 0) {
      const dbItems = transaction.items.map(item => ({
        transaction_id: transaction.id,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        buy_price: item.buyPrice,
        sell_price: item.sellPrice,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase.from('transaction_items').insert(dbItems);
      if (itemsError) console.error('Error saving transaction items:', itemsError);

      // 3. Update Product Stock
      if (transaction.type === TransactionType.IN || transaction.type === TransactionType.OUT) {
        for (const item of transaction.items) {
          const { data: prod } = await supabase.from('products').select('stock').eq('barcode', item.barcode).single();
          
          if (prod) {
            let newStock = prod.stock;
            if (transaction.type === TransactionType.IN) {
              newStock += item.quantity;
            } else {
              newStock -= item.quantity;
            }
            await supabase.from('products').update({ stock: newStock }).eq('barcode', item.barcode);
          }
        }
      }
    }
  },

  // --- DEBTS ---
  getDebts: async (): Promise<DebtRecord[]> => {
    const { data, error } = await supabase.from('debts').select('*');
    if (error) return [];

    return data.map((d: any) => ({
      id: d.id,
      type: d.type as DebtType,
      partyName: d.party_name,
      amount: Number(d.amount),
      paidAmount: Number(d.paid_amount),
      description: d.description,
      dueDate: Number(d.due_date),
      isPaid: d.is_paid,
      createdAt: Number(d.created_at)
    }));
  },

  saveDebt: async (debt: DebtRecord) => {
    const dbDebt = {
      id: debt.id,
      type: debt.type,
      party_name: debt.partyName,
      amount: debt.amount,
      paid_amount: debt.paidAmount,
      description: debt.description,
      due_date: debt.dueDate,
      is_paid: debt.isPaid,
      created_at: debt.createdAt
    };

    const { error } = await supabase.from('debts').upsert(dbDebt);
    if (error) console.error('Error saving debt:', error);
  },

  deleteDebt: async (id: string) => {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) console.error('Error deleting debt:', error);
  },

  // --- LEDGER / BUKU KAS ---
  getLedger: async (): Promise<LedgerEntry[]> => {
    const transactions = await db.getTransactions(); 
    
    // Sort oldest first to calculate running balance
    transactions.sort((a, b) => a.timestamp - b.timestamp);

    const ledger: LedgerEntry[] = [];
    let currentBalance = 0;

    transactions.forEach(t => {
        let entryType: 'DEBIT' | 'CREDIT' | null = null;
        let entryAmount = 0;
        let category: 'PENJUALAN' | 'BELANJA' | 'OPERASIONAL' | 'KOREKSI' = 'OPERASIONAL';

        if (t.type === TransactionType.OUT) {
           category = 'PENJUALAN';
           if (t.paymentMethod === 'CASH') {
             entryAmount = t.amountPaid - t.change;
             entryType = 'DEBIT';
           } else if (t.paymentMethod === 'DEBT') {
             entryAmount = t.amountPaid; // DP jika ada
             if (entryAmount > 0) entryType = 'DEBIT';
           }
        } else if (t.type === TransactionType.IN) {
           category = 'BELANJA';
           if (t.paymentMethod === 'CASH') {
              entryAmount = t.totalAmount;
              entryType = 'CREDIT';
           } else if (t.paymentMethod === 'DEBT') {
              entryAmount = t.amountPaid; 
              if (entryAmount > 0) entryType = 'CREDIT';
           }
        } else if (t.type === TransactionType.EXPENSE) {
            category = 'OPERASIONAL';
            entryAmount = t.totalAmount;
            entryType = 'CREDIT';
        } else if (t.type === TransactionType.INCOME) {
            category = 'OPERASIONAL';
            entryAmount = t.totalAmount;
            entryType = 'DEBIT';
        } else if (t.type === TransactionType.ADJUSTMENT) {
            category = 'KOREKSI';
            entryAmount = t.totalAmount;
            if (t.amountPaid === 1) { 
               entryType = 'DEBIT';
            } else { 
               entryType = 'CREDIT';
            }
        }

        if (entryType && entryAmount > 0) {
          if (entryType === 'DEBIT') {
            currentBalance += entryAmount;
          } else {
            currentBalance -= entryAmount;
          }

          ledger.push({
            id: t.id,
            date: t.timestamp,
            description: t.note || (t.type === TransactionType.OUT 
              ? `Penjualan ${t.partyName ? '- ' + t.partyName : ''}`
              : t.type === TransactionType.IN 
                ? `Belanja Stok ${t.partyName ? 'Ke ' + t.partyName : ''}`
                : t.type === TransactionType.EXPENSE ? 'Pengeluaran Operasional' 
                : t.type === TransactionType.INCOME ? 'Pemasukan Lain-lain'
                : 'Koreksi Saldo'),
            type: entryType,
            amount: entryAmount,
            balance: currentBalance,
            category: category
          });
        }
    });
      
    return ledger.reverse();
  },

  // --- HELPERS ---
  getParties: async (): Promise<string[]> => {
    const [debts, transactions] = await Promise.all([
      db.getDebts(),
      db.getTransactions()
    ]);
      
    const names = new Set([
      ...debts.map(d => d.partyName),
      ...transactions.filter(t => t.partyName).map(t => t.partyName!)
    ]);
    return Array.from(names).sort();
  },

  getTopProducts: async (): Promise<TopProduct[]> => {
    // 1. Fetch transaction items yang tipe transaksinya 'OUT' (Penjualan)
    // Note: Karena keterbatasan join di client-side sederhana, kita ambil data manual
    const { data: items, error } = await supabase
      .from('transaction_items')
      .select('barcode, name, quantity, sell_price, transaction_id');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('type', 'KELUAR');

    if (error || !items || !transactions) return [];

    // Filter items yang ID transaksinya ada di list transaksi KELUAR
    const outTxIds = new Set(transactions.map(t => t.id));
    const soldItems = items.filter((i: any) => outTxIds.has(i.transaction_id));

    // Aggregate
    const stats = new Map<string, {name: string, qty: number, revenue: number}>();
    
    soldItems.forEach((item: any) => {
      const current = stats.get(item.barcode) || { name: item.name, qty: 0, revenue: 0 };
      stats.set(item.barcode, {
        name: item.name,
        qty: current.qty + item.quantity,
        revenue: current.revenue + (item.quantity * item.sell_price)
      });
    });

    // Get current stock for these products
    const topBarcodes = Array.from(stats.keys());
    const { data: products } = await supabase.from('products').select('barcode, stock').in('barcode', topBarcodes);
    const stockMap = new Map((products || []).map((p: any) => [p.barcode, p.stock]));

    return Array.from(stats.entries()).map(([barcode, data]) => ({
      barcode,
      name: data.name,
      quantitySold: data.qty,
      revenue: data.revenue,
      stock: Number(stockMap.get(barcode) || 0)
    })).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);
  },

  // --- STATS ---
  getStats: async (): Promise<ShopStats> => {
    const [products, transactions, debts] = await Promise.all([
      db.getProducts(),
      db.getTransactions(),
      db.getDebts()
    ]);

    const today = new Date().setHours(0,0,0,0);
    const todayTransactions = transactions.filter(t => t.timestamp >= today);

    const totalSalesToday = todayTransactions
      .filter(t => t.type === TransactionType.OUT)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalProfitToday = todayTransactions
      .filter(t => t.type === TransactionType.OUT)
      .reduce((sum, t) => {
        const cost = t.items.reduce((c, i) => c + (i.buyPrice * i.quantity), 0);
        return sum + (t.totalAmount - cost);
      }, 0);

    const inventoryValue = products.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);

    // Calculate Cash Balance from Transactions
    let cashBalance = 0;
    transactions.forEach(t => {
        let entryAmount = 0;
        if (t.type === TransactionType.OUT) {
           if (t.paymentMethod === 'CASH') entryAmount = t.amountPaid - t.change;
           else if (t.paymentMethod === 'DEBT') entryAmount = t.amountPaid;
           cashBalance += entryAmount;
        } else if (t.type === TransactionType.IN) {
           if (t.paymentMethod === 'DEBT') entryAmount = t.amountPaid;
           else entryAmount = t.totalAmount; 
           cashBalance -= entryAmount;
        } else if (t.type === TransactionType.EXPENSE) {
           cashBalance -= t.totalAmount;
        } else if (t.type === TransactionType.INCOME) {
           cashBalance += t.totalAmount;
        } else if (t.type === TransactionType.ADJUSTMENT) {
           if (t.amountPaid === 1) cashBalance += t.totalAmount;
           else cashBalance -= t.totalAmount;
        }
    });

    return {
      totalSalesToday,
      totalProfitToday,
      lowStockCount: products.filter(p => p.stock < 5).length,
      inventoryValue,
      cashBalance,
      totalReceivable: debts.filter(d => d.type === DebtType.RECEIVABLE && !d.isPaid).reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0),
      totalPayable: debts.filter(d => d.type === DebtType.PAYABLE && !d.isPaid).reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0),
    };
  },

  seedDatabase: async () => {
    // Disabled
  }
};