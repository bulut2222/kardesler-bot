const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ı kandıran sunucu
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
    console.log("🔄 Zırhlı istek başlatılıyor (Ban aşma modu)...");
    
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
      httpRequestMethod: 'POST',
      httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'),
      // BAN AŞMAK İÇİN KRİTİK AYARLAR:
      customHttpRequestHeaders: [
        { "name": "accept", "value": "application/json, text/javascript, */*; q=0.01" },
        { "name": "x-requested-with", "value": "XMLHttpRequest" },
        { "name": "content-type", "value": "application/x-www-form-urlencoded; charset=UTF-8" },
        { "name": "referer", "value": "https://www.haremaltin.com/" }
      ],
      httpResponseBody: true,
      browserHtml: false // API ucu olduğu için tarayıcı açmıyoruz, kafasını karıştırmayalım
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
      console.log("✅ BAŞARI: Ban aşıldı ve Firebase güncellendi!");
    }
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ Hata Detayı:", errorMsg);
  }
}

// 60 saniyede bir çalıştır
setInterval(verileriCek, 60000);
verileriCek();