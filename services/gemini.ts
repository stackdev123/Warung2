
// Layanan AI telah dihapus sesuai permintaan.
// File ini dikosongkan untuk mencegah error import pada file lain yang mungkin masih mereferensikannya.

export const geminiService = {
  analyzeShop: async (): Promise<string> => {
    return "Fitur Asisten AI dinonaktifkan.";
  },

  identifyProduct: async (productName: string): Promise<any> => {
    return { category: 'Lainnya', buyPrice: 0, sellPrice: 0 };
  }
};
