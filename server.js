const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');
require('dotenv').config();

// Render'ı aktif tutan sahte sunucu
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
    console.log("🔄 Haremaltın ana sayfası üzerinden veri çekiliyor...");
    
    const response = await axios.post('https://api.zyte.com/v1/extract', {
      url: 'https://www.haremaltin.com/', // Ana sayfaya gidiyoruz
      browserHtml: true, // Tarayıcıyı zorunlu kılıyoruz
      javascript: true,   // JS çalıştırıyoruz (Banlanmamak için)
      httpResponseBody: false // browserHtml true iken bu false olmalı (422 hatası çözümü)
    }, {
      auth: { username: process.env.ZYTE_API_KEY, password: '' },
      timeout: 60000
    });

    const html = response.data.browserHtml;
    
    // Basit bir regex ile JSON verisini HTML içinden çekmeye çalışalım
    // Not: Bu kısım Haremaltın'ın HTML yapısına göre veriyi yakalar
    const match = html.match(/var\s+doviz_verileri\s*=\s*({.*?});/s);
    
    if (match) {
      const data = JSON.parse(match[1]);
      await db.ref('AltinGecmisi_Canli').set({
        veriler: data,
        sonGuncelleme: admin.database.ServerValue.TIMESTAMP
      });
      console.log("✅ BAŞARI: Ana sayfa verisi Firebase'e yazıldı!");
    } else {
      // Eğer regex bulamazsa alternatif veri yapısını dene veya sadece log at
      console.log("⚠️ HTML yüklendi ama veri yapısı bulunamadı. Alternatif metod deneniyor...");
      // Alternatif: Direkt ajax ucunu tarayıcı ile deniyoruz (browserHtml: true ile)
      return tryAjaxWithBrowser(); 
    }
  } catch (error) {
    console.error("❌ Hata Detayı:", error.response ? JSON.stringify(error.response.data) : error.message);
  }
}

// 422 hatasını aşan yeni deneme fonksiyonu
async function tryAjaxWithBrowser() {
    try {
        const response = await axios.post('https://api.zyte.com/v1/extract', {
            url: 'https://www.haremaltin.com/dashboard/ajax/doviz',
            httpRequestMethod: 'POST',
            httpRequestBody: Buffer.from('dil_kodu=tr').toString('base64'),
            browserHtml: true // Zyte'ın tarayıcısını kullanarak POST yapıyoruz
        }, {
            auth: { username: process.env.ZYTE_API_KEY, password: '' }
        });
        
        const data = JSON.parse(response.data.browserHtml.replace(/<[^>]*>?/gm, ''));
        if (data && data.data) {
            await db.ref('AltinGecmisi_Canli').set({
                veriler: data.data,
                sonGuncelleme: admin.database.ServerValue.TIMESTAMP
            });
            console.log("✅ BAŞARI: Ajax/Tarayıcı ile güncellendi!");
        }
    } catch (e) {
        console.log("❌ İkinci deneme de başarısız.");
    }
}

setInterval(verileriCek, 60000);
verileriCek();