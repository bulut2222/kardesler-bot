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
    console.log("🔄 Veri çekme işlemi başlatıldı...");
    
    // Asla kapanmayan ve botları engellemeyen en temiz kaynak
    const response = await axios.get('https://api.altin.in/canli/altin', {
        timeout: 10000 
    });

    if (response.data) {
      let data = response.data;
      let temizVeriler = {};
      
      const temizle = (val) => {
        if (!val) return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
      };

      // Altin.in formatını senin script.js'ye (GRAMALTIN, CEYREKALTIN) göre eşliyoruz
      const mapping = {
          'gram': 'GRAMALTIN',
          'ceyrek': 'CEYREKALTIN',
          'yarim': 'YARIMALTIN',
          'tam': 'TAMALTIN',
          'cumhuriyet': 'CUMHURIYETALTINI',
          'ata': 'ATAALTIN',
          'resat': 'RESATALTIN',
          '22ayar': '22AYARBILEZIK',
          '14ayar': '14AYARALTIN',
          'usd': 'USD',
          'eur': 'EUR',
          'ons': 'ONS'
      };

      for (let key in mapping) {
        if (data[key]) {
          let fbKey = mapping[key];
          temizVeriler[fbKey] = {
            Buying: temizle(data[key].alis),
            Selling: temizle(data[key].satis),
            Change: temizle(data[key].degisim || 0)
          };
        }
      }

      await db.ref('AltinGecmisi_Canli').set({
        veriler: temizVeriler,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler Firebase'e ulaştı! Siten artık dolacak. - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

setInterval(verileriCek, 60000);
verileriCek();