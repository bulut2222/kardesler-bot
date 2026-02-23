const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// 1. RENDER PORT HATASINI ÇÖZEN SUNUCU
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
    console.log("🔄 Veri çekme denemesi başlatılıyor...");
    
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
      httpRequestMethod: 'POST', // POST metodu şart
      // BODY kısmını en sade haliyle gönderiyoruz:
      httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'),
      httpResponseBody: true,
      // 422 hatasını aşmak için Tarayıcıyı KAPATIYORUZ (Sadece HTTP isteği atacağız)
      browserHtml: false 
    }, {
      auth: { username: process.env.ZYTE_API_KEY, password: '' },
      timeout: 30000
    });

    const body = Buffer.from(response.data.httpResponseBody, 'base64').toString();
    const data = JSON.parse(body);
    
    if (data && data.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: data.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ BAŞARI: Firebase güncellendi - " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    // Hatayı daha detaylı görmek için:
    const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ Hata Detayı:", errorDetail);
  }
}

// 60 saniyede bir çalıştır
setInterval(verileriCek, 60000);
verileriCek(); 
console.log("🚀 Bot ve Sunucu hazır...");