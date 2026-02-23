const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kardesler Kuyumculuk Botu Aktif\n');
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
    console.log("🔄 Kesin veri çekme işlemi başlatıldı...");
    
    // Dünyanın en stabil veri kaynaklarından biri
    const response = await axios.get('https://api.doviz.com/infos/v1', { timeout: 10000 });

    if (response.data) {
      let rawData = response.data;
      let temizVeriler = {};
      
      // Gelen karmaşık veriyi senin web sitenin (script.js) anlayacağı dile çeviriyoruz
      const mapping = {
          'gram-altin': 'GRAMALTIN',
          'ceyrek-altin': 'CEYREKALTIN',
          'yarim-altin': 'YARIMALTIN',
          'tam-altin': 'TAMALTIN',
          'cumhuriyet-altini': 'CUMHURIYETALTINI',
          'ata-altin': 'ATAALTIN',
          'resat-altin': 'RESATALTIN',
          '22-ayar-bilezik': '22AYARBILEZIK',
          '14-ayar-altin': '14AYARALTIN',
          'ons': 'ONS',
          'USD': 'USD',
          'EUR': 'EUR'
      };

      // Verileri tek tek ayıklıyoruz
      rawData.forEach(item => {
          if (mapping[item.slug]) {
              let fbKey = mapping[item.slug];
              temizVeriler[fbKey] = {
                  Buying: parseFloat(item.buying) || 0,
                  Selling: parseFloat(item.selling) || 0,
                  Change: parseFloat(item.change_rate) || 0
              };
          }
      });

      await db.ref('AltinGecmisi_Canli').set({
        veriler: temizVeriler,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler anında Firebase'e işlendi! - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

setInterval(verileriCek, 60000);
verileriCek();
console.log("🚀 Bot sarsılmaz modda başlatıldı!");