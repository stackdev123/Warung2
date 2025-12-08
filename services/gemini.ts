import { GoogleGenAI } from "@google/genai";
import { db } from './db';
import { Product, ShopStats } from '../types';

// NOTE: In a real production app, this key would be proxied. 
// For this demo, we assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  analyzeShop: async (): Promise<string> => {
    // Now awaiting the async DB calls
    const stats: ShopStats = await db.getStats();
    const products: Product[] = await db.getProducts();
    const allDebts = await db.getDebts();
    const debts = allDebts.filter(d => !d.isPaid);

    const lowStockItems = products
      .filter(p => p.stock < 10)
      .map(p => `${p.name} (Sisa: ${p.stock})`)
      .join(', ');

    const prompt = `
      Bertindaklah sebagai konsultan bisnis ahli untuk "Warung Kelontong" kecil di Indonesia.
      Berikut adalah data toko saat ini:
      
      - Penjualan Hari Ini: Rp ${stats.totalSalesToday.toLocaleString('id-ID')}
      - Keuntungan Hari Ini: Rp ${stats.totalProfitToday.toLocaleString('id-ID')}
      - Nilai Aset Stok: Rp ${stats.inventoryValue.toLocaleString('id-ID')}
      - Total Hutang (Harus dibayar): Rp ${stats.totalPayable.toLocaleString('id-ID')}
      - Total Piutang (Uang di pelanggan): Rp ${stats.totalReceivable.toLocaleString('id-ID')}
      
      Barang stok menipis: ${lowStockItems || 'Tidak ada'}
      
      Daftar Hutang/Piutang Belum Lunas:
      ${debts.map(d => `- ${d.type} ${d.partyName}: Rp ${d.amount}`).join('\n')}

      Berikan analisis singkat, ramah, dan memotivasi dalam 3 poin penting. 
      Fokus pada arus kas, saran stok, dan pengelolaan hutang piutang. 
      Gunakan Bahasa Indonesia yang natural dan mudah dipahami pemilik warung.
      Jangan gunakan format markdown yang rumit, cukup teks paragraf atau bullet points sederhana.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Maaf, asisten sedang istirahat. Coba lagi nanti.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Gagal menghubungkan ke asisten pintar. Periksa koneksi internet Anda.";
    }
  },

  identifyProduct: async (productName: string): Promise<Partial<Product>> => {
    // Helper to guess category and price range based on name
    const prompt = `
      Saya punya produk warung bernama "${productName}". 
      Tebak kategorinya (Makanan, Minuman, Sembako, Kebersihan, Rokok, Lainnya) 
      dan estimasi harga beli (buyPrice) dan jual (sellPrice) dalam Rupiah.
      
      Jawab HANYA dengan JSON format:
      { "category": "...", "buyPrice": 1000, "sellPrice": 1500 }
    `;

    try {
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { category: 'Lainnya', buyPrice: 0, sellPrice: 0 };
    }
  }
};