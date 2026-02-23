const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Hazırlığı
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const db = admin.database();

async function verileriCek() {
  const simdi = new Date();
  const trSaat = new Date(simdi.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
  const saat = trSaat.getHours();
  const dakika = trSaat.getMinutes();
  const gun = trSaat.getDay(); // 0 = Pazar

  // MESAİ KONTROLÜ: 08:30 - 19:30 arası çalış, Pazar günü çalışma
  if (gun === 0 || (saat < 8 || (saat === 8 && dakika < 30)) || saat >= 20) {
    console.log("Piyasa kapalı veya Pazar günü. Bot uykuda...");
    return;
  }

  try {
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
      httpRequestMethod: 'POST',
      httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'),
      // SİHİRLİ AYARLAR BURADA:
      browserHtml: true,
      javascript: true,
      automatedBrowser: true, // Gerçek bir tarayıcı motoru kullanır
      requestHeaders: { 
        "referer": "https://www.haremaltin.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, {
      auth: { username: process.env.ZYTE_API_KEY, password: '' },
      timeout: 60000 // 1 dakikaya çıkardık, tarayıcı açılması zaman alır
    });

    const data = JSON.parse(Buffer.from(response.data.httpResponseBody, 'base64').toString());
    const guncel = data.data;

    await db.ref('AltinGecmisi_Canli').set({
      veriler: guncel,
      sonGuncelleme: admin.database.ServerValue.TIMESTAMP
    });
    
    console.log("Canlı veriler başarıyla güncellendi.");
  } catch (error) {
    console.error("Hata oluştu:", error.message);
  } 
}

// 3 saniyede bir çalıştır
setInterval(verileriCek, 3000);