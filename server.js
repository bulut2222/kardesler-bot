const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// 1. RENDER'I SUSTURAN SUNUCU
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Aktif\n');
}).listen(process.env.PORT || 10000);

// 2. FIREBASE BAĞLANTISI
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
    console.log("🔄 Doğrudan veri çekme denemesi başlatılıyor...");
    
    // Zyte'ı aradan çıkarıp doğrudan Haremaltın'a gidiyoruz
    const response = await axios.post('https://www.haremaltin.com/dashboard/ajax/doviz', 
      'dil_kodu=tr', 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.haremaltin.com/'
        }
      }
    );

    if (response.data && response.data.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ BAŞARI: Veriler Firebase'e uçtu! - " + new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ Veri boş geldi, site yapısı değişmiş olabilir.");
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// 1 dakikada bir çalıştır
setInterval(verileriCek, 60000);
verileriCek(); 
console.log("🚀 Sade Bot Başlatıldı...");