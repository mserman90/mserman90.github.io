# Tosun Paşa Çiftliği

Besi sığırı, süt sığırı ve koyun işletmeleri için geliştirilmiş 3 bağımsız, açık kaynaklı, ücretsiz ve %100 çevrimdışı saha rehberine tek noktadan erişim sağlayan minimalist portal ekranı.

Portal Adresi: [https://mserman90.github.io/](https://mserman90.github.io/)

---

## Minimalist Hero Ekranı

Hero ekranı ücretsiz açık kaynaklı kütüphanelerden (Google Noto Icons) çekilen kaliteli renkli simgeler ve doğrudan başlatma kartlarından oluşur:
1. **Besi Sığırı** (Besi Çiftliği Rehberi)
2. **Süt Sığırı** (Süt Çiftliği Rehberi)
3. **Koyun** (Koyun Çiftliği Rehberi)

Tüm detaylı açıklamalar, karşılaştırma tablosu, konu filtreleri ve internetsiz telefona kurulum kılavuzu üst başlıkta yer alan **"Bilgi"** menüsü içerisine taşınmıştır.

---

## 3 Bağımsız Saha Uygulaması

Bu portaldaki 3 uygulama birbirinden tamamen bağımsız olarak çalışır, kodları birleştirilmemiştir ve her biri kendi çevrimdışı veri tabanına (localStorage) sahiptir:

1. **Besi Çiftliği Rehberi** (`/besi-saglik-rehberi/`)
   - 21 günlük kamyondan indirme, karşılama ve yem geçiş protokolü
   - Mezbaha kesim kilidi ve et İKAS ceza önleyici sayaç
   - Şerit metre ve kantarla canlı kilo (CAAG) ile %58 karkas randıman hesabı
   - Besi acil durumları (CCN beyin dönmesi, sidik zoru, arpa vurması)
   - Dışkı skoru ve yemlikten bütün tahıl kaçışı denetimi

2. **Süt Çiftliği Rehberi** (`/sut-saglik-rehberi/`)
   - Hasta muayenesi (ateş, kulak, geviş, meme şişliği)
   - İlaç arınma süresi (İKAS) ve tank sütü döküm/zarar sayacı
   - Sesli sağımcı uyarısı (küpe sorgulama ile "SAĞMA" uyarısı)
   - 21 günlük tohumlama, kuruya alma ve doğum takvimi
   - Buzağı ishal/sıvı tedavisi hesaplayıcısı

3. **Koyun Çiftliği Rehberi** (`/koyun-saglik-rehberi/`)
   - Mera ve ağıl acil durumları (çelerme, gebelik zehirlenmesi, kuzu donması)
   - Küçükbaşa özel güvenli ilaç ve İKAS arınma kataloğu
   - Koç katımı ve 150 günlük kuzulama takvimi
   - Kuzu yaşatma ve ilk 2 saatlik ağız sütü (kolostrum) hesabı
   - Şerit metreyle küçükbaş canlı ağırlık formülü

---

## Tasarım & Kullanıcı Deneyimi Standartları

- **Mutlak Kontrast & Monokrom Arayüz:** Siyah-beyaz zemin/yazı kontrastı ile gün ışığı altında ve gece ahırda maksimum okunabilirlik.
- **Evrensel Renkli Kütüphane Simgeleri:** Google Noto açık kaynak simge kütüphanesinden çekilen yüksek kaliteli hayvan simgeleri.
- **Yetiştirici Dili:** Tüm bilimsel ve klinik ifadeler sahadaki çiftçinin ve çobanın anlayacağı yalın Türkçe ile hazırlanmıştır.
- **%100 Çevrimdışı Çalışma (PWA):** Şebekenin çekmediği kırsalda ve ahırda internetsiz tam fonksiyon çalışır.
