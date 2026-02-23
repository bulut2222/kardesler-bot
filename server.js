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
    console.log("🔄 Trunçgil API'den İnsan Taklidiyle (Kimlikli) veriler çekiliyor...");
    
    // Karşı tarafı kandırmak için gerçek bir tarayıcı kimliği gönderiyoruz
    const response = await axios.get('https://finans.truncgil.com/v4/today.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
      },
      timeout: 15000 // 15 saniye bekleme süresi
    });

    if (response.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler Firebase'e yazıldı! Siten artık canlı. - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// 1 dakikada bir güncelle
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 İnsan Görünümlü Bot Başlatıldı...");