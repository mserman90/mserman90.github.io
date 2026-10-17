# Tosun Paşa Çiftliği

Büyükbaş ve küçükbaş hayvancılık işletmeleri için geliştirilmiş 3 uzman, açık kaynaklı, ücretsiz ve %100 çevrimdışı saha uygulamasına tek noktadan erişim sağlayan bağımsız çiftlik portalı.

Portal Canlı Adresi: [https://mserman90.github.io/](https://mserman90.github.io/)

---

## 3 Uzman Saha Uygulaması

Proje, birbirini tamamlayan ancak birbirinden tamamen bağımsız olarak %100 çevrimdışı çalışan 3 modülden oluşur:

### 1. 🩺 Çoban Doktor (`/coban-doktor/`)
- **Merkezi Hastalık Ön Teşhisi:** Sığır, buzağı, koyun ve kuzu için soru-cevaplı karar ağacı ile saha triyajı.
- **Hızlı Ateş / Derece Kontrolü:** Rektal vücut ısısının hayvan türüne ve yaşına göre anında fizyolojik kıyaslanması.
- **Canlı İKAS Süt & Et Kilidi Defteri:** İlaç arınma sürelerinin saniye saniye geri sayımı, tank sütü koruma kilidi ve mezbaha kesim yasağı denetimi.
- **Sıvı & Kolostrum Tedavisi:** İshalli buzağı/kuzularda dehidrasyona göre 24 saatlik elektrolit-serum ihtiyacı ve Brix refraktometre kolostrum hesabı.
- **Acil İlk Yardım Protokolleri:** Şişme, asidoz, çelerme, zehirlenme ve doğum felcinde veteriner altın müdahale kuralları.

### 2. 🌾 Rasyon Rehberi (`/rasyon-rehberi/`)
- **Uluslararası Bilimsel Standart (NASEM 2021 / NRC / CNCPS):** Süt ineği, besi danası ve koyun/kuzu için hassas besleme motoru.
- **Tek Tıkla Otomatik Yem Dengeleme:** Seçilen yemlerle hayvanın kuru madde, enerji ve protein ihtiyacını en düşük maliyetle çözen optimizasyon.
- **TMR Vagon Kantarı:** Karıştırma sırası ve kümülatif kantar takibi ile 1.000 kg fabrika yemi kırma formülasyonu.
- **Sınırsız Özel Yem Ekleme:** Çiftçinin kendi arpa kırması, silajı veya yerel küspesini sisteme kaydedip rasyona dahil edebilmesi.
- **Metabolik Risk Analizi:** Gizli asidoz (SARA), laminit, DCAD ve sidik zoru risk uyarıları.

### 3. 🍼 Üretim Rehberi (`/uretim-rehberi/`)
- **283 Günlük Büyükbaş Gebelik & Doğum Çarkı:** 21. gün dönüş kontrolü, 45-60. gün ultrason, 223. gün kuruya alma ve 253. gün buzağı ishali aşısı takvimi.
- **150 Günlük Küçükbaş Koç Katımı Takvimi:** Koç katımı, ikiz gebelik kontrolü, kurutma, flaşlama beslemesi ve kuzulama tarihi.
- **Sabah - Akşam Tohumlama Saati:** Kızgınlığın (östrus) görüldüğü saate göre en yüksek tutma oranlı tohumlama zamanı.
- **Damızlık Olgunluk Eşiği:** Düve ve toklularda ilk aşım için canlı ağırlık ve yaş barajı kontrolü.
- **Çevrimdışı Sürü Döl Defteri:** Küpe bazlı yerel gebelik kayıtları ve doğuma kalan gün rozetleri.

---

## Mimari & Standartlar

- **%100 Çevrimdışı ve Yerel (PWA):** Tüm uygulamalar Service Worker ve LocalStorage ile internet bağlantısı olmadan dağda, yaylada ve ahırda eksiksiz çalışır.
- **Sıfır Sunucu & Tam Gizlilik:** Çiftlik kayıtları, hayvan küpeleri ve rasyon reçeteleri hiçbir sunucuya gönderilmez; yalnızca kullanıcının kendi cihazında saklanır.
- **Çiftçi Dili & Sade Arayüz:** Karmaşık veteriner hekimlik ve zootekni terimleri ilkokul mezunu yetiştiricinin rahatlıkla anlayabileceği sade bir dille sunulmuştur.
- **Yüksek Kontrast & Erişilebilirlik:** Güneş ışığı altında ve gece ahırda çalışmayı kolaylaştıran yüksek kontrast modu ve büyük yazı (A+) desteği.
