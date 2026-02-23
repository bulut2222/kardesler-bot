const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Aktif\n');
}).listen(process.env.PORT || 10000);

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
    console.log("🔄 Veri çekme işlemi başlatıldı...");
    
    // Trunçgil API'sine AllOrigins üzerinden güvenli erişim
    const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent('https://finans.truncgil.com/v4/today.json')}`);
    
    // AllOrigins veriyi "contents" içinde string olarak gönderir, onu objeye çeviriyoruz
    const data = JSON.parse(response.data.contents);

    if (data && data["Update_Date"]) {
      let temizVeriler = {};
      
      for (let key in data) {
        if (key === "Update_Date") continue;
        
        let item = data[key];
        const temizle = (val) => {
          if (!val) return 0;
          return parseFloat(val.toString().replace('%', '').replace(/\./g, '').replace(',', '.')) || 0;
        };

        // Firebase için uygun hale getirilen isimler
        let fbKey = key.replace(/[.#$\[\]]/g, '');

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
      console.log("✅ BAŞARILI: Veriler Firebase'e aktarıldı! - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata oluştu:", error.message);
  }
}

setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Bot her dakika güncellenmek üzere hazır!");