const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ı ayakta tutan basit sunucu
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kardesler Kuyumculuk Botu Aktif\n');
}).listen(process.env.PORT || 10000);

// Firebase Bağlantısı
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
  });
}
const db = admin.database();

async function verileriCek() {
  try {
    console.log("🔄 Veri toplama işlemi başlatılıyor...");
    
    // Köprüyü en yalın haliyle kullanıyoruz (400 hatasını engeller)
    const url = 'https://finans.truncgil.com/v4/today.json';
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(proxy, { timeout: 15000 });
    
    if (response.data && response.data.contents) {
      const data = JSON.parse(response.data.contents);
      let temizVeriler = {};
      
      const temizle = (val) => {
        if (!val) return 0;
        let s = val.toString().replace('%', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(s) || 0;
      };

      for (let key in data) {
        if (key === "Update_Date") continue;
        
        let item = data[key];
        let fbKey = key.replace(/[.#$\[\]]/g, ''); // Firebase yasaklı karakter temizliği

        temizVeriler[fbKey] = {
          Buying: temizle(item.Alış),
          Selling: temizle(item.Satış),
          Change: temizle(item.Değişim)
        };
      }

      await db.ref('AltinGecmisi_Canli').set({
        veriler: temizVeriler,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ BAŞARILI: Fiyatlar Firebase'e işlendi. - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// Dakikada bir çalıştır
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Bot yayında!");