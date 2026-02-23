const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const db = admin.database();

async function verileriCek() {
  try {
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
      httpRequestMethod: 'POST',
      httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'),
      httpResponseBody: true
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
      console.log("✅ Başarıyla güncellendi: " + new Date().toLocaleTimeString());
    }
  } catch (error) {
    console.error("❌ Hata:", error.message);
  }
}

setInterval(verileriCek, 30000);
console.log("🚀 Bot başlatıldı...");