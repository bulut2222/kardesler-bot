const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kardesler Bot Aktif\n');
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
    console.log("🔄 Veri çekme denemesi (Yahoo Finance)...");
    
    // Yahoo Finance üzerinden Dolar ve Ons Altın çekiyoruz (En garantili yol)
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m');
    const onsPrice = response.data.chart.result[0].meta.regularMarketPrice;
    
    const responseDolar = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/TRY=X?interval=1m');
    const dolarPrice = responseDolar.data.chart.result[0].meta.regularMarketPrice;

    // Gram Altın Hesabı: (Ons / 31.1035) * Dolar
    const gramAltin = (onsPrice / 31.1035) * dolarPrice;

    const temizVeriler = {
        "GRAMALTIN": { Buying: gramAltin * 0.99, Selling: gramAltin, Change: 0.1 },
        "USD": { Buying: dolarPrice * 0.99, Selling: dolarPrice, Change: 0.05 },
        "ONS": { Buying: onsPrice - 1, Selling: onsPrice, Change: 0.2 },
        "CEYREKALTIN": { Buying: gramAltin * 1.60, Selling: gramAltin * 1.64, Change: 0.1 },
        "14AYARALTIN": { Buying: gramAltin * 0.58, Selling: gramAltin * 0.62, Change: 0.1 }
    };

    await db.ref('AltinGecmisi_Canli').set({
      veriler: temizVeriler,
      sonGuncelleme: admin.database.ServerValue.TIMESTAMP
    });
    
    console.log("✅ BAŞARILI: Veriler Yahoo üzerinden hesaplandı ve gönderildi!");
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

setInterval(verileriCek, 60000);
verileriCek();