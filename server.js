const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// 1. RENDER'I AKTİF TUTAN SUNUCU
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
    console.log("🔄 Bigpara üzerinden taze veriler çekiliyor...");
    
    // Bigpara'nın halka açık ve hızlı veri kaynağı
    const response = await axios.get('https://proweb.bigpara.com/altin/piyasa/canli');

    if (response.data && response.data.data) {
      // Bigpara verilerini senin Firebase yapına uygun hale getiriyoruz
      await db.ref('AltinGecmisi_Canli').set({
        veriler: response.data.data, 
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ BAŞARI: Bigpara verileri Firebase'e uçtu! - " + new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ Veri boş geldi veya format değişti.");
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

// 60 saniyede bir güncelle (Yeterli bir süre)
setInterval(verileriCek, 60000);
verileriCek(); 
console.log("🚀 Bigpara Botu Başlatıldı...");