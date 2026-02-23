const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

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
    console.log("🔄 Kesin veri çekme işlemi başlatıldı...");
    
    // Engelleme yapmayan, hızlı ve stabil yeni kaynak
    const response = await axios.get('https://api.genelpara.com/embed/altin.json', {
        timeout: 10000 
    });

    if (response.data) {
      let data = response.data;
      let temizVeriler = {};
      
      const temizle = (val) => {
        if (!val) return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
      };

      // GenelPara formatını senin script.js'ye uygun hale getiriyoruz
      const mapping = {
          "GA": "GRAMALTIN",
          "C": "CEYREKALTIN",
          "Y": "YARIMALTIN",
          "T": "TAMALTIN",
          "A": "ATAALTIN",
          "USD": "USD",
          "EUR": "EUR",
          "ONS": "ONS"
      };

      for (let key in mapping) {
        if (data[key]) {
          let fbKey = mapping[key];
          temizVeriler[fbKey] = {
            Buying: temizle(data[key].alis),
            Selling: temizle(data[key].satis),
            Change: temizle(data[key].degisim)
          };
        }
      }

      await db.ref('AltinGecmisi_Canli').set({
        veriler: temizVeriler,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ ZAFER: Veriler saniyeler içinde Firebase'e işlendi! - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

setInterval(verileriCek, 60000);
verileriCek();