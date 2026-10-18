# TEK UYGULAMA MİMARİSİ VE SIFIRDAN ÜRETİM ŞARTNAMESİ (MASTER SPECIFICATION)

> **Tosun Paşa Çiftliği: Bütünleşik Çiftlik & Hayvancılık Yönetim Sistemi**  
> *Bu belge; Çoban Doktor, Rasyon Rehberi, Üretim Rehberi, Yem Bitkileri ve Merkezi Veri İstasyonu modüllerini tek bir çatı altında, modern, çevrimdışı öncelikli (Offline-First PWA) ve tam mobil uyumlu tekil bir uygulama olarak sıfırdan kodlamak için gereken tüm mimariyi, veri modellerini, algoritmaları ve uygulama promptunu içerir.*

---

## İÇİNDEKİLER
1. [Sistem Vizyonu ve Tasarım İlkeleri](#1-sistem-vizyonu-ve-tasarım-ilkeleri)
2. [UI/UX Tasarım Sistemi & Görsel Standartlar](#2-uiux-tasarım-sistemi--görsel-standartlar)
3. [Bütünleşik Mimari ve Durum (State) Yönetimi](#3-bütünleşik-mimari-ve-durum-state-yönetimi)
4. [Modül 1: Çoban Doktor (Saha Ön Teşhis & Triyaj)](#4-modül-1-çoban-doktor-saha-ön-teşhis--triyaj)
5. [Modül 2: Rasyon Rehberi (Bilimsel Besleme & LP Simplex)](#5-modül-2-rasyon-rehberi-bilimsel-besleme--lp-simplex)
6. [Modül 3: Üretim Rehberi (Döl Verimi & Biyolojik Takvimler)](#6-modül-3-üretim-rehberi-döl-verimi--biyolojik-takvimler)
7. [Modül 4: Yem Bitkileri & Silaj Rehberi (Agromoni & Tohum)](#7-modül-4-yem-bitkileri--silaj-rehberi-agromoni--tohum)
8. [Merkezi Veri İstasyonu, Yedekleme & CSV Motoru](#8-merkezi-veri-istasyonu-yedekleme--csv-motoru)
9. [PWA, Servis Çalışanı (SW) & Bildirim Mimarisi](#9-pwa-servis-çalışanı-sw--bildirim-mimarisi)
10. [Sıfırdan Üretim İçin Ana Kodlama İstemi (Master Prompt)](#10-sıfırdan-üretim-için-ana-kodlama-istemi-master-prompt)

---

## 1. Sistem Vizyonu ve Tasarım İlkeleri

### 1.1. Temel Felsefe
- **%100 Çevrimdışı Çalışma (Offline-First):** Dağda, merada, yaylada veya bodrum katındaki ahırda internet bağlantısı (hücresel veri / Wi-Fi) olmadan tüm hesaplamalar, veri kayıtları ve karar destek mekanizmaları eksiksiz çalışmalıdır.
- **Sıfır Harici Sunucu (Zero-Server Dependency):** Kullanıcı verileri (küpeler, rasyonlar, tohumlama tarihleri, tarla kayıtları) hiçbir merkezi sunucuya aktarılmaz. Tüm veriler yalnızca kullanıcının cihazında (`localStorage` / `IndexedDB`) şifresiz ve güvenli tutulur.
- **Saha Şartlarına Uygunluk & Çiftçi Dili:** Ekranlar güneş altında okunabilir yüksek kontrasta sahip olmalı, veteriner hekimlik ve zootekni terimleri ilkokul mezunu bir yetiştiricinin de kolaylıkla anlayabileceği pratik Türkçe açıklamalarla desteklenmelidir.
- **Tekil Uygulama (Unified Ecosystem):** 4 ayrı uzmanlık alanı, tek bir başlık barı, tek bir alt navigasyon (veya sekme menüsü) ve tek bir merkezi veritabanı üzerinden ortak veri paylaşımı yapmalıdır.

---

## 2. UI/UX Tasarım Sistemi & Görsel Standartlar

### 2.1. Tasarım Kuralları
- **Köşe Yuvarlama (Corner Radius):** Tüm butonlar, kartlar, giriş kutuları (inputs) ve açılır pencereler (modals) **kesinlikle köşeli** olmalıdır (`border-radius: 4px;`). Aşırı yuvarlak (pill / rounded-full) veya 8px+ yuvarlamalar yasaktır.
- **Minimum Dokunmatik Alan:** Sahada kaba ellerle ve eldivenle rahat kullanım için tüm tıklanabilir elemanların `min-height` değeri en az `40px` (tercihen `44px`) olmalıdır.
- **Tipografi:** Modern, okunaklı sistem fontları ve Google Fonts:
  - Birincil Font: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Sayısal Veriler: `font-variant-numeric: tabular-nums;` (hizalı muhasebe ve rasyon tabloları için).

### 2.2. Renk Paleti (CSS Değişkenleri)
```css
:root {
  --primary-dark: #075e54;     /* Koyu Kurumsal Yeşil (Header, Ana Çerçeve) */
  --primary: #128c7e;          /* Canlı Zümrüt Yeşili (Aktif Butonlar, Vurgular) */
  --primary-light: #25d366;    /* Açık Yeşil (Başarı, Pozitif Uyarılar) */
  --primary-hover: #0a6f63;    /* Buton Hover Rengi */
  --bg: #efeae2;               /* Klasik Sıcak Arka Plan (Göz Yormayan Açık Gri-Bej) */
  --card-bg: #ffffff;          /* Beyaz Kart ve Modal Zeminleri */
  --text: #111b21;             /* Koyu Metin (Yüksek Okunabilirlik) */
  --text-muted: #54656f;       /* Yardımcı ve Açıklama Metinleri */
  --border: #d1d7db;           /* Çerçeve Çizgileri */
  --danger: #dc2626;           /* Acil Durum / Zehirlenme / Arınma Süresi */
  --warning: #f59e0b;          /* Dikkat / Sınırda / Kontrol Uyarısı */
  --radius: 4px;               /* Sabit Köşe Standardı */
  --shadow-sm: 0 1px 2px rgba(11, 20, 26, 0.08);
  --shadow-md: 0 3px 8px rgba(11, 20, 26, 0.12);
}

/* Yüksek Kontrastlı Gece Modu (Dark Mode) */
body.dark-mode {
  --bg: #0b141a;
  --card-bg: #111b21;
  --text: #e9edef;
  --text-muted: #8696a0;
  --border: #222e35;
  --primary-dark: #111b21;
  --primary: #00a884;
  --primary-hover: #029071;
}
```

### 2.3. Üst Başlık (Header) Standardı
- **Sol Taraf:** 42×42 px boyutunda dairesel beyaz zeminli SVG avatar rozeti (`noto-ox.svg`), yanında 2 satırlı başlık hiyerarşisi:
  - `<h1>Tosun Paşa Çiftliği</h1>`
  - `<p>çevrimiçi • Saha Karar Destek & Çiftlik Portalı</p>`
- **Sağ Taraf (Aksiyon Butonları):** Yarı saydam (`background: rgba(255, 255, 255, 0.16); border: 1.5px solid rgba(255,255,255,0.35); color: #ffffff; border-radius: 4px;`):
  1. `💾 Veri Merkezi` (Tüm çiftliği tek tıkla yedekle/yükle)
  2. `📲 Yükle` (PWA BeforeInstallPrompt)
  3. `ℹ️ Kılavuz` (Kullanım rehberi)
  4. `🌙 Gece Modu` / `☀️ Gündüz`

---

## 3. Bütünleşik Mimari ve Durum (State) Yönetimi

Uygulama tek bir HTML dosyasında (Single Page Application - SPA) çalışmalı veya modüler web bileşenleri halinde paketlenmelidir.

### 3.1. Ana Navigasyon Sekmeleri (Master Tab Bar)
Sayfa üstünde veya mobilde ekran altında sabitlenen 4 ana çalışma modu:
1. `🩺 Çoban Doktor` (`tab-doctor`)
2. `🌾 Rasyon Rehberi` (`tab-ration`)
3. `🍼 Üretim Rehberi` (`tab-repro`)
4. `🌱 Yem Bitkileri` (`tab-forage`)

### 3.2. Merkezi Veri Şeması (`ciftlik_master_db_v1`)
Tüm modüller verilerini tek bir JSON nesnesi altında `localStorage` üzerinde saklar:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-10-18T12:00:00Z",
  "farmInfo": {
    "farmName": "Tosun Paşa Çiftliği",
    "owner": "Çiftlik Yöneticisi"
  },
  "doctor": {
    "earTagRecords": [
      {
        "id": "rec_001",
        "tagNo": "TR-06-1234567",
        "species": "sigir",
        "diagnosis": "Akut Timpani (Şişme)",
        "drugName": "Dimetikon + Spazmolitik",
        "treatmentDate": "2026-10-18T08:00:00Z",
        "milkLockHours": 72,
        "meatLockDays": 14,
        "notes": "Sol açlık çukuru gergin, köpüklü gaz."
      }
    ]
  },
  "ration": {
    "customFeeds": [],
    "savedRecipes": [
      {
        "id": "rec_ration_01",
        "name": "Besi Danası 400kg Son Dönem",
        "targetAnimal": "besi_400",
        "ingredients": [
          { "feedId": "misir_dane", "amountKg": 5.5 },
          { "feedId": "arpa_ezme", "amountKg": 2.5 },
          { "feedId": "yonca_kuru", "amountKg": 2.0 },
          { "feedId": "bugday_samani", "amountKg": 1.2 },
          { "feedId": "ptk_34", "amountKg": 1.5 },
          { "feedId": "mermer_tozu", "amountKg": 0.1 }
        ]
      }
    ]
  },
  "reproduction": {
    "records": [
      {
        "id": "rep_001",
        "tagNo": "TR-34-889900",
        "species": "cattle",
        "name": "Sarıkız",
        "inseminationDate": "2026-03-01",
        "sire": "Simental Max",
        "check21Date": "2026-03-22",
        "ultrasoundDate": "2026-04-15",
        "dryOffDate": "2026-10-10",
        "vaccineDate": "2026-11-09",
        "expectedCalvingDate": "2026-12-09",
        "status": "pregnant"
      }
    ]
  },
  "forage": {
    "fieldRecords": [
      {
        "id": "field_001",
        "fieldName": "Köy Önü Çayır Mevkii",
        "areaDa": 25,
        "cropType": "Yonca + İtalyan Çimi",
        "seedingDate": "2026-04-05",
        "fertilizer": "Taban: 25 kg 20-20-0, Üst: 15 kg Üre",
        "harvestYieldKg": 12500,
        "notes": "1. Biçim yapıldı, silaj nemi %68."
      }
    ]
  }
}
```

---

## 4. Modül 1: Çoban Doktor (Saha Ön Teşhis & Triyaj)

### 4.1. Amacı ve Özellikleri
Veteriner hekim sahaya ulaşana kadar acil triyaj, ilk yardım ve sürü takibi sağlayan uzman sistem.

### 4.2. Alt Araçlar ve Algoritmalar
1. **Saha Karar Ağacı Motoru:**
   - Hayvan Seçimi: Sığır (İnek/Düve/Tosun), Buzağı, Koyun, Kuzu.
   - Semptom Kategorileri: Sindirim (İshal, Şişme, Gaz), Solunum (Öksürük, Hırıltı, Burun Akıntısı), Doğum & Meme (Mastitis, Güç Doğum, Eş Atamama), Sinirsel/Topallık (Yatma, Felç, Titreme, Basamama).
   - Ağırlıklı Puanlama Algoritması: Belirtilen semptomların hastalık matrisindeki korelasyon katsayısına göre en olası 3 ön teşhisi yüzdesel olasılıkla listeler.
2. **Hızlı Ateş / Rektal Derece Kontrolü:**
   - Referans Aralıkları:
     - *Yetişkin Sığır:* 38.0°C – 39.0°C (39.5°C+ Ateş, 41.0°C+ Acil Tehlike, <37.5°C Hipotermi/Doğum Felci)
     - *Buzağı:* 38.5°C – 39.5°C
     - *Koyun / Koç:* 38.5°C – 39.5°C
     - *Kuzu:* 39.0°C – 40.0°C
   - Tek tıkla girilen dereceyi renklendirerek fizyolojik durumu raporlar.
3. **Canlı İKAS Süt & Et Arınma Süresi Kilidi:**
   - İlaç ismi, et arınma günü ve süt arınma saati girilir.
   - Sayfa açıkken veya arka planda `setInterval` ile kalan saat, dakika ve saniye geri sayımı yapılır.
   - Süre dolmadan tanka süt katılması veya hayvanın kesime gönderilmesi kırmızı uyarı banner'ı ile engellenir.
4. **Sıvı & Kolostrum Hesaplayıcı:**
   - Dehidrasyon Belirtisi (%5 Hafif, %8 Orta - göz küresi çökük, %10-12 Ağır - hayvan ayağa kalkamıyor).
   - 24 Saatlik Sıvı İhtiyacı: `Toplam Sıvı (L) = (Canlı Ağırlık kg × Dehidrasyon %'si) + Günlük Yaşama Payı (50-80 ml/kg)`.
   - Brix Refraktometre Kolostrum Skalası:
     - >%22 Brix: Mükemmel kalite (>50 mg/ml IgG) -> Yeni doğana ilk 2 saatte 4 litre verilir.
     - %18-%22 Brix: Orta kalite -> Destekleyici verilir.
     - <%18 Brix: Zayıf kalite -> Asla ilk ağız sütü olarak verilmez.
5. **Acil İlk Yardım Altın Protokolleri:**
   - Akut Timpani (Köpüklü/Gazlı Şişme trokar ve sondayla gaz alma adımları).
   - Asidoz (Bikarbonatlı serum ve rumen yıkama adımları).
   - Enterotoksemi / Çelerme (Toksoid aşı ve antiserum müdahalesi).
   - Hipokalsemi (Kalsiyum boroglukonatın damar içine ılık ve yavaş verilmesi kuralı).

---

## 5. Modül 2: Rasyon Rehberi (Bilimsel Besleme & LP Simplex)

### 5.1. Amacı ve Özellikleri
Süt sığırı, besi danası ve koyun/kuzu için NASEM 2021 ve NRC standartlarına uygun, hayvanın gereksinimlerini sağlarken rasyon maliyetini en aza indiren en ucuz reçete robotu.

### 5.2. Doğrusal Programlama (Simplex Algorithm) Motoru
Saf JavaScript ile tarayıcıda çalışan Simplex algoritması matrisi:
- **Amaç Fonksiyonu:** `Minimimze Z = Σ (Fiyat_i × Miktar_i)`
- **Kısıtlar:**
  - `Σ Miktar_i (Kuru Madde) = KM İhtiyacı (kg/gün)`
  - `Σ (Ham Protein_i × Miktar_i) ≥ Min HP (g veya %)`
  - `Σ (ME_i × Miktar_i) ≥ Min Metabolik Enerji (Mcal veya MJ)`
  - `Σ (NDF_i × Miktar_i) ≥ Min NDF (%) ve ≤ Max NDF (%)`
  - `Σ (Kaba Yem Oranı) ≥ %40 (Rumen sağlığı için)`
  - `Σ (Ca_i × Miktar_i) / Σ (P_i × Miktar_i) ≥ 1.5 ve ≤ 2.0 (Ca:P Oranı)`

### 5.3. Temel Yem Veritabanı (45+ Yem Hammaddesi)
Her yem için: İsim, Kategori (Kaba, Kesif, Sanayi Yan Ürünü, Mineral), KM (Kuru Madde %), HP (Ham Protein %), ME (Metabolik Enerji Mcal/kg KM), NDF (Nötr Deterjan Lif %), ADF %, Kalsiyum %, Fosfor %, Varsayılan Birim Fiyat (TL/kg).
- *Örnek Yemler:* Yonca Kuru Otu, Mısır Silajı, Buğday Samanı, Ryegrass Otu, Arpa Ezme, Mısır Dane, Pamuk Tohumu Küspesi (PTK %34), Soya Küspesi (%44), Ayçiçeği Küspesi (ATK %28), Kepek, Şeker Pancarı Posası, Melas, Mermer Tozu, Tuz, Mermer Tozu, Sodyum Bikarbonat, Canlı Maya.

### 5.4. Ek Rasyon Araçları
1. **TMR Mikser Vagon Kantarı:**
   - Optimize edilen rasyon reçetesi tek tıkla vagona aktarılır.
   - Sürü Hayvan Sayısı girilir (örn: 50 baş).
   - Mikser kantar sıfırlama (Dara) ve kümülatif tartım göstergesi: Sırasıyla samanı dök -> arpayı dök -> silajı dök adımlarında hedef kg ve vagondaki toplam ağırlık gösterilir.
2. **Pearson Karesi:** İki yem (örn: Mısır Unu %8 HP ile Soya Küspesi %44 HP) arasında hedeflenen protein oranını (%16) yakalamak için gereken karışım yüzdeleri.
3. **Göğüs Çevresinden Canlı Ağırlık (CAAG) Tahmini:**
   - Formül: `Ağırlık (kg) = (Göğüs Çevresi cm)^2 × Vücut Uzunluğu cm / 10838` (veya Schoorl standardı).

---

## 6. Modül 3: Üretim Rehberi (Döl Verimi & Biyolojik Takvimler)

### 6.1. Amacı ve Özellikleri
Sürünün reprodüktif döngüsünü hatasız yönetmek; tohumlama, ultrason, kuruya alma, aşı ve doğum tarihlerini otomatik hesaplamak.

### 6.2. Biyolojik Hesaplama Motorları
1. **283 Günlük Büyükbaş Gebelik & Doğum Takvimi:**
   - Tohumlama Tarihi ($T_0$) girildiğinde anında üretilen kritik kilometre taşları:
     - **21. Gün:** Kızgınlık Dönüş Kontrolü (Tekrar boğaya geldi mi?)
     - **45–60. Gün:** Veteriner Ultrason / Rektal Gebelik Muayenesi
     - **220–223. Gün:** Kuruya Alma Tarihi (Sütü kes, meme içi kuru dönem antibiyotiği uygula)
     - **253. Gün:** Buzağı İshali (Koli/Rota/Corona) Koruyucu Anne Aşısı
     - **283. Gün:** Tahmini Doğum Günü (Doğum locasını hazırla)
2. **150 Günlük Küçükbaş Koç Katımı Takvimi:**
   - Koç Katım Başlangıcı ($T_0$):
     - **$T_0 - 15$ Gün:** Flaşlama Beslemesi (Flushing - kondisyon artırma)
     - **45–60. Gün:** Ultrason ile İkizlik Kontrolü
     - **105. Gün:** Kuruya Çıkarma & Gebelik Toksemisi Önleyici Rasyon
     - **120. Gün:** Enterotoksemi (Çelerme) Anne Aşısı
     - **150. Gün:** Tahmini Kuzulama Başlangıcı
3. **Sabah-Akşam Tohumlama Saati Kuralı (AM-PM Rule):**
   - Kızgınlık sabah görüldüyse (06:00 – 11:00) -> Aynı gün akşamı tohumla (17:00 – 21:00).
   - Kızgınlık akşam/gece görüldüyse (17:00 – 23:00) -> Ertesi gün sabah tohumla (07:00 – 11:00).
4. **Damızlık Olgunluk Eşiği Kontrolü:**
   - Düvelerde: Canlı ağırlık ergin ağırlığın en az %60-65'ine (Simental/Holstein için ~380-400 kg), yaş 14-16 aya ulaşmadan tohumlama yapılmaz.
   - Toklularda: Ergin ağırlığın en az %65-70'i (~45-50 kg), yaş 10-12 ay.

---

## 7. Modül 4: Yem Bitkileri & Silaj Rehberi (Agromoni & Tohum)

### 7.1. Amacı ve Özellikleri
Kaba yem üretiminde doğru tohum seçimi, tohum miktarı, gübreleme takvimi, mikrodalgada silaj kuru madde testi ve özel tohum karışımları hazırlama.

### 7.2. Uzman Agromoni Veritabanı
15+ Bitki Kartı (Yonca, Korunga, Silajlık Mısır, Sorgum-Sudan Otu Melezi, Macar Fiği, Yem Bezelyesi, İtalyan Çimi/Ryegrass, Kılçıksız Brom, Çayır Otu, Yulaf, Arpa, Tritikale).
- Her bitki için: Ekim derinliği (cm), dekara tohum (kg/da), ekim ayları, taban gübresi (N-P-K), üst gübreleme, biçim/hasat fenolojisi (örn: yoncada %10 çiçeklenme, mısırda süt çizgisi 1/2).

### 7.3. Hesaplama Motorları
1. **İdeal Tohumluk Karışım Robotu:**
   - Kullanıcı elindeki tohumları ve arazisinin büyüklüğünü (dekar) seçer.
   - Üretim Amacı Seçimi: Kuru Ot / Balya, Otlatma / Mera, Yüksek Enerjili Silaj.
   - Algoritma: Baklagil-buğdaygil dengesini (örn: %60 Macar Fiği + %40 Tritikale veya %70 Ryegrass + %30 Yem Bezelyesi) kurarak dekara gereken net tohum kg'ını, toplam torba/çuval ihtiyacını, mivzer ekim derinliği tavsiyesini ve beklenen ham protein oranını hesaplar.
2. **Mikrodalga Fırında Hızlı Silaj Kuru Madde & Nem Testi:**
   - Adımlar: 100 gram taze kıyılmış numune tartılır ($A_1$). Yanında bir bardak su ile mikrodalgada kurutulur. Kuru ağırlık tartılır ($A_2$).
   - Formül: $\text{Kuru Madde \%} = (A_2 / A_1) \times 100$, $\text{Nem \%} = 100 - \text{Kuru Madde \%}$.
   - Değerlendirme: %65–70 Nem = İdeal paketleme; >%72 Nem = Klostridyum riski (kefir kokusu/küflenme); <%60 Nem = Yetersiz sıkışma ve hava kalması riski.
3. **Silo Hacim ve Tonaj Kapasitesi:**
   - Kelepçe/Hendek silosu: `Hacim (m³) = [(Taban Genişliği + Tavan Genişliği) / 2] × Yükseklik × Uzunluk`.
   - `Kapasite (Ton) = Hacim (m³) × Sıkıştırma Yoğunluğu (650-750 kg/m³) / 1000`.

---

## 8. Merkezi Veri İstasyonu, Yedekleme & CSV Motoru

### 8.1. Çiftlik Veri Merkezi (Backup Center)
Tüm modülleri kapsayan tek bir modal penceresi:
- **💾 Tüm Çiftliği Yedekle (JSON):**
  - Dosya Adı: `Tosun_Pasa_Ciftlik_Yedek_YYYY-MM-DD.json`
  - İçerik: Küpe defteri kayıtları, aktif ilaç kilitleri, kayıtlı rasyonlar, döl takip defteri ve ekili tarla listesi.
- **📂 Yedekten Geri Yükle:**
  - JSON dosyasını okuyup doğrular (`JSON.parse`).
  - Tüm ilgili `localStorage` anahtarlarını günceller ve arayüzü anında tazeler.
- **📊 Excel Uyumlu CSV Dışa Aktarımı:**
  - Türkçe karakter sorununu (ş, ğ, ı, ö, ü, ç) önlemek için dosyanın başına **UTF-8 BOM (`\uFEFF`)** eklenir.
  - Sütunlar noktalı virgül (`;`) ile ayrılır (Türkiye Excel varsayılanı).

---

## 9. PWA, Servis Çalışanı (SW) & Bildirim Mimarisi

### 9.1. Web App Manifest (`manifest.json`)
```json
{
  "name": "Tosun Paşa Çiftliği",
  "short_name": "TosunPaşa",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#075e54",
  "theme_color": "#075e54",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### 9.2. Servis Çalışanı (`sw.js`) Önbellek Stratejisi
- **Cache-First (Önbellek Öncelikli):** Statik varlıklar (HTML, CSS, JS, SVG ikonlar, fontlar) ilk ziyarette önbelleğe alınır.
- Çevrimdışı iken ağ hataları sessizce yakalanır ve cihazdaki önbellek sunulur.
- Otomatik Güncelleme: Service Worker yeni bir sürüm algıladığında (`reg.onupdatefound`) arka planda önbelleği yeniler ve kullanıcıya temiz bir yenileme sunar.

### 9.3. Web Bildirimleri (Alarmlar)
- `Notification.requestPermission()` ile kullanıcı izni alınır.
- Doğum günü gelen hayvanlar, kuruya ayrılması gerekenler ve ilaç arınma süresi (İKAS) biten hayvanlar için zamanı geldiğinde sistem bildirimi tetiklenir.

---

## 10. Sıfırdan Üretim İçin Ana Kodlama İstemi (Master Prompt)

> **Bu istemi (prompt), yapay zekaya veya geliştirme ortamına vererek projenin tamamını tek seferde, eksiksiz ve çalışan bir tekil uygulama olarak üretebilirsiniz:**

```markdown
Sen kıdemli bir tam donanımlı web mühendisi, zooteknist ve tarım teknolojileri uzmanısın.
Görevin; büyükbaş ve küçükbaş hayvancılık işletmeleri için "Tosun Paşa Çiftliği" adında, %100 çevrimdışı çalışabilen (Offline PWA), mobil öncelikli, responsive ve son derece şık, profesyonel tek parça bir çiftlik yönetim uygulaması üretmektir.

### KESİN TASARIM VE MİMARİ KURALLAR:
1. TEK UYGULAMA (SPA): Uygulama tek bir index.html çatısı altında veya modüler temiz bir yapıda olmalı; Çoban Doktor, Rasyon Rehberi, Üretim Rehberi ve Yem Bitkileri modüllerini 4 ana sekme olarak içermelidir.
2. KÖŞELİ VE SAHA UYUMLU: Tüm butonlar, kartlar, pencereler ve form elemanları kesinlikle köşeli (border-radius: 4px) olmalıdır. Kesinlikle aşırı yuvarlak butonlar kullanılmayacaktır.
3. RENK PALETİ: Kurumsal zümrüt yeşili (#075e54, #128c7e, #25d366), yüksek kontrastlı zemin (#efeae2 / gece modunda #0b141a) ve siyah/beyaz yüksek kontrast kullanılmalıdır. Karışık gökkuşağı buton renkleri yasaktır; tüm aksiyon düğmeleri kurumsal ve yarı saydam standartta olmalıdır.
4. ÇEVRİMDİŞİ VE YEREL DEPOLAMA: Sıfır sunucu! Tüm veriler (küpeler, rasyonlar, tohumlamalar, tarlalar) localStorage üzerinde tek bir JSON nesnesinde tutulmalıdır.
5. STANDART ÜST BAŞLIK: Sol tarafta dairesel SVG avatar, "Tosun Paşa Çiftliği" başlığı ve "çevrimiçi • Çiftlik Portalı" alt başlığı bulunmalı; sağ tarafta [💾 Veri Merkezi], [📲 Yükle], [ℹ️ Kılavuz] ve [🌙 Gece Modu] butonları yer almalıdır.

### MODÜL DETAYLARI:
- MODÜL 1 (ÇOBAN DOKTOR): Soru-cevaplı karar ağacı ile saha ön teşhisi, rektal derece kontrolü (sığır/buzağı/koyun/kuzu), canlı İKAS süt/et arınma süresi geri sayım kilidi, dehidrasyon bazlı sıvı tedavisi ve Brix refraktometre kolostrum testi.
- MODÜL 2 (RASYON REHBERİ): Simplex doğrusal programlama robotu ile maliyet optimizasyonu, 45+ yemlik bilimsel hammadde ambarı, TMR kümülatif mikser vagon kantarı, Pearson karesi ve canlı ağırlık (CAAG) tahmini.
- MODÜL 3 (ÜRETİM REHBERİ): 283 günlük büyükbaş inek çarkı (21. gün, 45. gün ultrason, 223. gün kuru dönem, 253. gün aşı, 283. gün doğum), 150 günlük koyun koç katımı takvimi, sabah-akşam tohumlama saati kuralı, damızlık olgunluk eşiği ve döl defteri.
- MODÜL 4 (YEM BİTKİLERİ): 15 yaygın yem bitkisi yetiştiricilik rehberi, dekara tohum ve gübre hesaplayıcı, mikrodalga silaj nem testi, silo hacim/tonaj hesabı ve tohumluk karışım robotu (kuru ot/mera/silaj hedefine göre dekar oranları ve beklenen protein).
- VERİ MERKEZİ: Tüm modülleri kapsayan tek tıkla JSON yedekleme/geri yükleme ve UTF-8 BOM destekli Excel uyumlu CSV dışa aktarımı.

Lütfen bu yönergelere harfiyen uyarak, eksiksiz, üretim kalitesinde, tüm formülleri ve veritabanı hazır tekil web uygulamasını oluştur.
```
