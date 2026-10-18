# Tosun Paşa Çiftliği

Büyükbaş ve küçükbaş hayvancılık işletmeleri için geliştirilmiş 4 uzman, açık kaynaklı, ücretsiz ve %100 çevrimdışı saha uygulamasına tek noktadan erişim sağlayan bağımsız çiftlik portalı.

Portal Canlı Adresi: [https://mserman90.github.io/](https://mserman90.github.io/)

---

## 4 Uzman Saha Uygulaması

Proje, birbirini tamamlayan ancak birbirinden tamamen bağımsız olarak %100 çevrimdışı çalışan 4 modülden oluşur:

### 1. 🩺 Çoban Doktor (`/coban-doktor/`)
- **Merkezi Hastalık Ön Teşhisi:** Sığır, buzağı, koyun ve kuzu için soru-cevaplı karar ağacı ile saha triyajı.
- **Hızlı Ateş / Derece Kontrolü:** Rektal vücut ısısının hayvan türüne ve yaşına göre anında fizyolojik kıyaslanması.
- **Canlı İKAS Süt & Et Kilidi Defteri:** İlaç arınma sürelerinin saniye saniye geri sayımı, tank sütü koruma kilidi ve mezbaha kesim yasağı denetimi.
- **Sıvı & Kolostrum Tedavisi:** İshalli buzağı/kuzularda dehidrasyona göre 24 saatlik elektrolit-serum ihtiyacı ve Brix refraktometre kolostrum hesabı.
- **Acil İlk Yardım Protokolleri:** Şişme, asidoz, çelerme, zehirlenme ve doğum felcinde veteriner altın müdahale kuralları.

### 2. 🌾 Rasyon Rehberi (`/rasyon-rehberi/`)
- **Doğrusal Maliyet Optimizasyonu (Simplex LP Robotu):** Seçilen yem fiyatları ve besin kısıtları doğrultusunda hayvanın ihtiyacını karşılayan matematiksel olarak en ucuz rasyon karışımını çözer.
- **Uluslararası Bilimsel Standart (NASEM 2021 / NRC / CNCPS):** Süt ineği, besi danası ve koyun/kuzu için hassas besleme motoru.
- **TMR Vagon Kantarı Entegrasyonu:** Optimize edilen rasyonu tek tıkla kümülatif mikser vagon kantarına aktarma.
- **Yem Ambarı & Yedekleme:** Fiyatları ve özel yem ham maddelerini JSON ve Excel/CSV formatlarında dışa aktarma ve geri yükleme.
- **Metabolik Risk Analizi:** Gizli asidoz (SARA), laminit, DCAD ve sidik zoru risk uyarıları.

### 3. 🍼 Üretim Rehberi (`/uretim-rehberi/`)
- **283 Günlük Büyükbaş Gebelik & Doğum Çarkı:** 21. gün dönüş kontrolü, 45-60. gün ultrason, 223. gün kuruya alma ve 253. gün buzağı ishali aşısı takvimi.
- **150 Günlük Küçükbaş Koç Katımı Takvimi:** Koç katımı, ikiz gebelik kontrolü, kurutma, flaşlama beslemesi ve kuzulama tarihi.
- **PWA Doğum & Kuru Dönem Alarmları:** Doğumu yaklaşanlar, kuruya ayrılacaklar ve 21. gün gebelik kontrolleri için tarayıcı bildirimleri.
- **Damızlık Olgunluk Eşiği:** Düve ve toklularda ilk aşım için canlı ağırlık ve yaş barajı kontrolü.
- **Çevrimdışı Sürü Döl Defteri & Yedek:** Kayıtları JSON ve Excel/CSV formatlarında yedekleme ve dışa aktarma.

### 4. 🌱 Yem Bitkileri (`/yem-bitkileri/`)
- **Uzman Agromoni Veritabanı:** 15+ yaygın yem bitkisi (Yonca, Korunga, Silajlık Mısır, Sorgum, Fiğ, Yem Bezelyesi, Ryegrass, vb.) yetiştiricilik takvimi, tohum normu ve gübreleme planı.
- **İdeal Tohumluk Karışım Robotu:** Kuru ot, mera veya silaj hedefi doğrultusunda tohum oranlarını, dekar normunu, mivzer ekim derinliğini ve beklenen ham protein oranını otomatik oluşturan motor.
- **Mikrodalgada Silaj Kuru Madde & Nem Testi:** Kıyılmış numunenin mikrodalgada kurutulmasıyla dakikalar içinde silaj nemini (%65-70) ve hasat uygunluğunu belirleme.
- **Silo Hacim & Kapasite Hesabı:** Hendek ve kelepçe siloları için hacim ($m^3$) ve sıkışma yoğunluğuna göre tonaj tahmini.
- **Çevrimdışı Tarla Defteri:** Parsel, ekim tarihi, tohum çeşidi ve hasat verimlerini yerel olarak saklama.

---

## Tek Bir Uygulama Olarak Sıfırdan Üretim Şartnamesi

Tüm modülleri (Çoban Doktor, Rasyon Rehberi, Üretim Rehberi, Yem Bitkileri ve Çiftlik Veri Merkezi) sıfırdan tekil bir web uygulaması (SPA / PWA) olarak yeniden üretmek için hazırlanan eksiksiz mimari şartnameye ve kodlama istemine **[TEK_UYGULAMA_MIMARISI.md](./TEK_UYGULAMA_MIMARISI.md)** dosyasından ulaşabilirsiniz.

---

## Mimari & Standartlar

- **%100 Çevrimdışı ve Yerel (PWA):** Tüm uygulamalar Service Worker ve LocalStorage ile internet bağlantısı olmadan dağda, yaylada ve ahırda eksiksiz çalışır.
- **PWA Web Notifications:** Kritik ilaç arınma süreleri dolduğunda veya doğum/kuru dönem geldiğinde istemci tarafında anlık sesli/görsel bildirimler.
- **Veri Yedekleme & Excel/CSV Desteği:** Tek tıkla tüm çiftliği JSON olarak yedekleme, geri yükleme ve Excel uyumlu (UTF-8 BOM) CSV tabloları oluşturma.
- **Doğrusal Programlama (Least-Cost):** Tarayıcıda çalışan saf JavaScript Simplex algoritması ile en ucuz rasyon çözücüsü.
- **Sıfır Sunucu & Tam Gizlilik:** Çiftlik kayıtları, hayvan küpeleri ve rasyon reçeteleri hiçbir sunucuya gönderilmez; yalnızca kullanıcının kendi cihazında saklanır.
- **Çiftçi Dili & Sade Arayüz:** Karmaşık veteriner hekimlik ve zootekni terimleri ilkokul mezunu yetiştiricinin rahatlıkla anlayabileceği sade bir dille sunulmuştur.
- **Yüksek Kontrast & Erişilebilirlik:** Güneş ışığı altında ve gece ahırda çalışmayı kolaylaştıran yüksek kontrast modu ve büyük yazı (A+) desteği.
