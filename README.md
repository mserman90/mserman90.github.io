# Çiftlik Sağlık & Üretim Rehberleri Portalı

Süt inekçiliği, besi danacılığı ve küçükbaş koyunculuk işletmeleri için geliştirilmiş 3 bağımsız, açık kaynaklı, ücretsiz ve %100 çevrimdışı saha rehberine tek noktadan erişim sağlayan portal ekranı.

Portal Adresi: [https://mserman90.github.io/](https://mserman90.github.io/)

---

## 3 Bağımsız Saha Uygulaması

Bu portaldaki 3 uygulama birbirinden tamamen bağımsız olarak çalışır, kodları birleştirilmemiştir ve her biri kendi çevrimdışı veri tabanına (localStorage) sahiptir:

1. **Süt Çiftliği Rehberi** (`/sut-saglik-rehberi/`)
   - Hasta muayenesi (ateş, kulak, geviş, meme şişliği)
   - İlaç arınma süresi (İKAS) ve tank sütü döküm/zarar sayacı
   - Sesli sağımcı uyarısı (küpe sorgulama ile "SAĞMA" uyarısı)
   - 21 günlük tohumlama, kuruya alma ve doğum takvimi
   - Buzağı ishal/sıvı tedavisi hesaplayıcısı

2. **Besi Çiftliği Rehberi** (`/besi-saglik-rehberi/`)
   - 21 günlük kamyondan indirme, karşılama ve yem geçiş protokolü
   - Mezbaha kesim kilidi ve et İKAS ceza önleyici sayaç
   - Şerit metre ve kantarla canlı kilo (CAAG) ile %58 karkas randıman hesabı
   - Besi acil durumları (CCN beyin dönmesi, sidik zoru, arpa vurması)
   - Dışkı skoru ve yemlikten bütün tahıl kaçışı denetimi

3. **Koyun Çiftliği Rehberi** (`/koyun-saglik-rehberi/`)
   - Mera ve ağıl acil durumları (çelerme, gebelik zehirlenmesi, kuzu donması)
   - Küçükbaşa özel güvenli ilaç ve İKAS arınma kataloğu
   - Koç katımı ve 150 günlük kuzulama takvimi
   - Kuzu yaşatma ve ilk 2 saatlik ağız sütü (kolostrum) hesabı
   - Şerit metreyle küçükbaş canlı ağırlık formülü

---

## Tasarım & Kullanıcı Deneyimi Standartları

- **Mutlak Kontrast & Monokrom Tasarım:** Tamamen siyah-beyaz (#000000 ve #ffffff) zemin/yazı kontrastı ile gün ışığı altında ve gece ahırda maksimum okunabilirlik.
- **Sıfır İkon & Yalın Arayüz:** Dikkati dağıtacak hiçbir görsel ikon veya emoji barındırmaz.
- **Yetiştirici Dili:** Tüm bilimsel ve klinik ifadeler sahadaki çiftçinin ve çobanın anlayacağı yalın Türkçe ile hazırlanmıştır.
- **%100 Çevrimdışı Çalışma (PWA):** Şebekenin çekmediği kırsalda ve ahırda internetsiz tam fonksiyon çalışır.
