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
    console.log("🔄 Şifresiz Trunçgil API'den taze veriler çekiliyor...");
    
    // ŞİFRE YOK, ÜYELİK YOK, 404 YOK:
    const response = await axios.get('https://finans.truncgil.com/v4/today.json');

    if (response.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler Firebase'e yazıldı! - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// 1 dakikada bir güncelle
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Trunçgil Bot Başlatıldı...");