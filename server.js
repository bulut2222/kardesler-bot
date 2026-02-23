const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase bağlantısı
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});
const db = admin.database();

async function verileriCek() {
  try {
    // Zyte üzerinden Haremaltın'ın gizli veri mutfağına POST isteği atıyoruz
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
      httpRequestMethod: 'POST', // Mutlaka POST olmalı
      httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'), // Dil kodunu gönderiyoruz
      httpResponseBody: true
    }, {
      auth: { 
        username: process.env.ZYTE_API_KEY, 
        password: '' // Zyte kuralı gereği şifre boş bırakılır
      }
    });

    // Gelen veriyi çözüyoruz
    const body = Buffer.from(response.data.httpResponseBody, 'base64').toString();
    const data = JSON.parse(body);
    
    // Veri yapısını kontrol edip Firebase'e yazıyoruz
    if (data && data.data) {
      await db.ref('AltinGecmisi_Canli').set({
        veriler: data.data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ Başarıyla güncellendi: " + new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ Veri geldi ama beklenen formatta değil.");
    }
  } catch (error) {
    // 422 hatası alırsak buraya düşer ve hatayı detaylı gösterir
    console.error("❌ Hata:", error.response ? JSON.stringify(error.response.data) : error.message);
  }
}

// Haremaltın'ın bizi engellememesi için 30 saniyede bir çalıştırıyoruz
setInterval(verileriCek, 30000);
console.log("🚀 Bot başlatıldı, veri bekleniyor...");