const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ı mutlu eden sunucu
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
    console.log("🔄 Kapalı Çarşı API'den veriler çekiliyor (Engelsiz Kaynak)...");
    
    // Render'ı engellemeyen ve web sitenle tam uyumlu çalışan yeni kaynak
    const response = await axios.get('https://kapalicarsi.apiluna.org/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 20000 // Soket hatası (bağlantı kopması) olmasın diye süreyi 20 saniyeye çıkardık
    });

    if (response.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler Firebase'e TERTEMİZ yazıldı! Siten artık canlı. - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// 1 dakikada bir güncelle
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Kapalı Çarşı Bot Başlatıldı...");