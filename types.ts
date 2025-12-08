
export enum TransactionType {
  IN = 'MASUK', // Restock
  OUT = 'KELUAR', // Sale
  EXPENSE = 'PENGELUARAN', // Operasional Keluar
  INCOME = 'PEMASUKAN', // Operasional Masuk
  ADJUSTMENT = 'PENYESUAIAN' // Revisi/Koreksi Saldo
}

export interface Product {
  barcode: string;
  name: string;
  category: string;
  buyPrice: number; // Harga Beli (Modal)
  sellPrice: number; // Harga Jual
  stock: number;
  pcsPerCarton?: number; // Jumlah pcs dalam 1 dus/karton
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  timestamp: number;
  items: CartItem[];
  totalAmount: number;
  note?: string;
  // Payment Details
  paymentMethod: 'CASH' | 'DEBT' | 'QRIS';
  amountPaid: number; // Uang yang diterima/dibayar
  change: number; // Kembalian
  partyName?: string; // Nama Pelanggan (jika Piutang) atau Supplier (jika Hutang)
}

export enum DebtType {
  PAYABLE = 'HUTANG', // Kita berhutang ke supplier
  RECEIVABLE = 'PIUTANG', // Orang berhutang ke kita (Bon)
}

export interface DebtRecord {
  id: string;
  type: DebtType;
  partyName: string; // Supplier name or Customer name
  amount: number; // Total amount of debt
  paidAmount?: number; // Amount already paid (Cicilan)
  description: string;
  dueDate: number;
  isPaid: boolean;
  createdAt: number;
}

export interface ShopStats {
  totalSalesToday: number;
  totalProfitToday: number;
  lowStockCount: number;
  totalReceivable: number;
  totalPayable: number;
  inventoryValue: number;
  cashBalance: number; // Saldo Kas Saat Ini (Untuk Neraca)
}

export interface LedgerEntry {
  id: string;
  date: number;
  description: string;
  type: 'DEBIT' | 'CREDIT'; // Debit = Uang Masuk, Credit = Uang Keluar
  amount: number;
  balance: number;
  category: 'PENJUALAN' | 'BELANJA' | 'OPERASIONAL' | 'KOREKSI';
}