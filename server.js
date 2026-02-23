const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ı aktif tutan sunucu
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Aktif\n');
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
    console.log("🔄 Trunçgil API'den Proxy (Gizli Köprü) ile veriler çekiliyor...");
    
    let data = null;
    
    // 1. KÖPRÜ (Render IP'sini gizlemek ve engelleri aşmak için)
    try {
        const ts = Date.now(); // Cache (önbellek) engeline takılmamak için şifre
        const hedefUrl = encodeURIComponent('https://finans.truncgil.com/v4/today.json?t=' + ts);
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + hedefUrl;
        const response = await axios.get(proxyUrl, { timeout: 15000 });
        data = response.data;
    } catch (err) {
        console.log("⚠️ Birinci köprü yanıt vermedi, ikinci köprüye geçiliyor...");
        // 2. KÖPRÜ (Yedek)
        const ts = Date.now();
        const proxyUrl2 = 'https://api.codetabs.com/v1/proxy?quest=https://finans.truncgil.com/v4/today.json?t=' + ts;
        const response2 = await axios.get(proxyUrl2, { timeout: 15000 });
        data = response2.data;
    }

    if (data && data["Update_Date"]) {
      let temizVeriler = {};
      
      for (let key in data) {
        if (key === "Update_Date") continue;
        
        let item = data[key];
        
        // Sitenin çökmemesi için "3.000,50" formatını 3000.50 gibi saf sayılara dönüştürüyoruz
        const temizle = (str) => {
          if (!str) return 0;
          let s = str.toString().replace('%', '').replace(/\./g, '').replace(',', '.');
          let num = parseFloat(s);
          return isNaN(num) ? 0 : num;
        };

        // Firebase'in hata vermemesi için isimlerdeki zararlı karakterleri siliyoruz
        let fbKey = key.replace(/[.#$\[\]]/g, '');

        temizVeriler[fbKey] = {
          Buying: item.Alış ? temizle(item.Alış) : 0,
          Selling: item.Satış ? temizle(item.Satış) : 0,
          Change: item.Değişim ? temizle(item.Değişim) : 0
        };
      }

      await db.ref('AltinGecmisi_Canli').set({
        veriler: temizVeriler,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Temizlenmiş veriler Firebase'e yazıldı! - " + new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ Veri çekildi ama beklenen formatta değil.");
    }
  } catch (error) {
    console.error("❌ Hata Detayı:", error.message);
  }
}

// 1 dakikada bir güncelle
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Proxy (Köprü) Botu Başlatıldı...");