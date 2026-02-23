const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ın kapanmasını engelleyen sunucu
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
    console.log("🔄 CollectAPI'den veriler çekiliyor...");
    
    const response = await axios.get('https://api.collectapi.com/economy/goldPrice', {
      headers: {
        'content-type': 'application/json',
        'authorization': process.env.COLLECTAPI_KEY // Render'daki anahtarı buraya otomatik çeker
      }
    });

    if (response.data && response.data.success) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data.result,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler Firebase'e yazıldı! Siten artık canlı. - " + new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ Veri geldi ama beklenen formatta değil:", response.data);
    }
  } catch (error) {
    console.error("❌ Hata Detayı:", error.response ? JSON.stringify(error.response.data) : error.message);
  }
}

// 1 dakikada bir güncelle
setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 CollectAPI Botu Başlatıldı...");