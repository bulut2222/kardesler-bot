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
    console.log("🔄 Veri çekme denemesi başlatılıyor (Süre uzatıldı)...");
    
    // Zaman aşımını 40 saniyeye çıkardık ve rastgele bir sayı ekleyerek Trunçgil'i şaşırttık
    const url = `https://finans.truncgil.com/v4/today.json?nocache=${Date.now()}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(proxy, { 
        timeout: 40000, // 40 saniye sabırla bekle
        headers: { 'Accept': 'application/json' }
    });
    
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
      console.log("✅ BAŞARILI: Veriler 40 saniyelik sabrın sonunda Firebase'e ulaştı! - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
        console.error("⚠️ Trunçgil hala çok yavaş, bir sonraki dakikada tekrar deneyeceğim.");
    } else {
        console.error("❌ Hata:", error.message);
    }
  }
}

setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Bot sabır moduyla başlatıldı!");