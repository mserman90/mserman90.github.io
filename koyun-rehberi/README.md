# Koyun Çiftliği Rehberi (Offline-First & PWA)

**Canlı Yayın (Web & Mobil PWA):** [https://mserman90.github.io/koyun-saglik-rehberi/](https://mserman90.github.io/koyun-saglik-rehberi/)  
**GitHub Deposu:** [https://github.com/mserman90/koyun-saglik-rehberi](https://github.com/mserman90/koyun-saglik-rehberi)  
**Detaylı Kullanım Kılavuzu:** [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

Bu uygulama, **koyun ve keçi yetiştiricileri, çobanlar ve küçükbaş çiftlikleri** için en eski ve en basit akıllı telefonlardan masaüstü/dizüstü bilgisayarlara kadar her cihazda **hiçbir internet bağlantısı veya sunucu kurulumu gerektirmeden** çalışan Progressive Web App (PWA) mimarili çevrimdışı (%100 offline) bir **küçükbaş sürü sağlığı, acil ilk yardım, koç katımı/tohumlama, kuzu bakımı ve İKAS asistanıdır**.

---

## Nasıl Çalıştırılır & Kurulur?

1. **Cep Telefonunda (Android / iOS):**
   - [https://mserman90.github.io/koyun-saglik-rehberi/](https://mserman90.github.io/koyun-saglik-rehberi/) adresini tarayıcınızda açın.
   - Tarayıcı menüsünden *"Ana Ekrana Ekle"* (Add to Home Screen) veya *"Uygulamayı Yükle"* seçeneğine dokunun.
   - Uygulama telefonun yerel hafızasına kurulur. İnternetsiz dağda, yaylada ve baz istasyonunun çekmediği taş ağıllarda bağımsız, tam ekran ve jet hızında çalışır.

2. **Bilgisayarda:**
   - [`index.html`](./index.html) dosyasına çift tıklayarak tarayıcınızda doğrudan çalıştırabilirsiniz.

---

## Saha Öncelikli Durum Merkezleri (Status Hubs)

Ağıl ve mera koşullarındaki **acil müdahale önceliği** ve eldivenli kullanıma göre optimize edilmiştir. Sayfa altındaki gezinme ikonları yerine ana ekranda 5 büyük **Koyun Durumu Ana Menüsü** merkezi yer alır:

1. **HASTA / ACİL KOYUN:** İlk Yardım (Gebelik Zehirlenmesi / İkiz Koması, Çelerme / Çelerme (Yem Çarpması), Kuzu Donması / Hipotermi, Sidik Zoru, Kurt Isırması, İşkembe Gaz Şişmesi şişmesi, Adrenalin şok dozu), Hasta Muayenesi & Durum Tespiti & Makat Ateşi (38.5–40.0°C), İlaç Yap & Süt/Et Kilitle (İKAS).
2. **SAĞIM & SÜT/ET GÜVENLİĞİ:** Sağımcı Ekranı (Dev puntolu yüksek kontrastlı siyah-beyaz süt ve kesim izni, mezbaha kesim kilitleri), Dökülen Süt Zarar & Masraf Defteri.
3. **YENİ DOĞUM, KUZU & KOÇ KATIMI:** Kuzu Kolostrumu (İlk 2 saatte 300-400 mL), Brix Kalite Ölçer, Kuzu İshali Sıvı Hesabı, Koç Katımı & Doğum Çarkı (17 gün kızgınlık, 150 gün gebelik).
4. **YENİ KOYUN GİRİŞİ & AŞI:** Yeni Koyun/Kuzu Kaydı (Karantina Bölmesi), Akıllı Aşı Takvimi (Çelerme, Çiçek, PPR Veba, Şap, Brucella).
5. **YEMLİK, İŞKEMBE & GEVİŞ:** Geviş Getirme Sayacı (%58-60 hedef), Koyun Fındığı/Zibin Kıvamı (1-5), Tampon Karbonat Hesabı (15-30 gr/koyun), Şerit Metre ile Kilo Ölçer.

---

## Gösterge Paneli & Küpe Numaralı Kritik Takip

- **Tohumlama / Koç Katımı Zamanı Göstergesi:** Önceki aşımdan/tohumlamadan 14–19 gün geçmiş (17 günlük kızgınlık döngüsü) koyunlar ile 12–20 aylık damızlık toklular otomatik hesaplanır. Karta dokunarak üreme takvimini açabilirsiniz.
- **Uyarılı Küpe Numaraları Çipleri:** Sayfa başındaki kritik takip listesinde kafa karıştırıcı sayılar yerine doğrudan hayvanların **Kulak Küpe Numaraları** listelenir.
- **Koyun Uyarı & Sağlık Kartı Modalı:** Herhangi bir küpeye dokunulduğunda koyunun aktif süt engeli, kesim kilidi, koç katımı dönüşü, yaklaşan aşısı veya sağlık uyarısı tek ekranda açılır; ilgili butonla doğrudan müdahaleye yönlendirir.
- **Kategori Filtreleme:** Uyarılı hayvanları *Tümü*, *İlaç & İKAS*, *Üreme & Doğum*, *Aşı* ve *Sağlık & Karantina* olarak tek dokunuşla süzebilirsiniz.

---

## Barındırdığı Temel Küçükbaş Saha Modülleri

0. **& Eller Serbest Sesli Küpe Sorgulama ve Barkod/QR Okuma:**
   - **Sesli Küpe Sorgulama (Web Speech API):** Ağılda veya merada eller kirli ve eldivendeyken ekrana dokunmadan *"yüz kırk beş"* veya *"TR 16 00 12"* deyin. Sistem koyunu anında bulur ve hoparlörden sesli olarak yanıtlar: *"Kırmızı Alarm! 145 numaralı koyunun sütü yasaklı! Tanka sağmayın! Kalan süre: 24 saat"* veya *"145 temiz, sağıma uygundur, tanka dökülebilir."*
   - **Barkod & QR Kamera Okuma:** Hayvan arama, muayene, ilaç/İKAS, sağımcı kontrolü ve yeni koyun ekleme ekranlarında yerel kamera kütüphanesiyle küpeleri otomatik okur (%100 offline).

1. **Küçükbaş Acil İlk Yardım & Hayat Kurtarma:**
   - **Gebelik Zehirlenmesi (İkiz Koması / Ketozis):** Ağızdan propilen glikol/pekmez ve damardan serum desteği.
   - **Çelerme / Yem Çarpması (Bağırsak Zehirlenmesi):** Yemi kesme, karbonatlı su ve Clostridium antitoksin serumu.
   - **Yeni Doğan Kuzu Donması (Hipotermi):** Isıtma lambası/kutusu ve ısındıktan sonra kolostrum protokolü.
   - **Sidik Zoru & İdrar Yolu Tıkanması:** Koçlarda penis ucu taş uzantısı müdahalesi ve amonyum klorür.
   - **Kurt/Köpek Isırması & Kanama:** Basınçlı tampon, tentürdiyot ve tetanoz koruması.
   - **İşkembe Gazı & Şişmesi:** Sıvı yağ içirme, trokar ve aşı ve ilaç alerji şokunda otomatik adrenalin dozu hesabı.

2. **Ahırda Muayene & Durum Tespiti:**
   - Makat ateşi (38.5–40.0 °C koyun referansı, >40.2 °C yüksek ateş alarmı), nabız (70–90), nefes (15–30), işkembe ve klinik skorlama motoru.

3. **Küçükbaş İKAS & Hayati İlaç Kuralları:**
   - Tilmikosin (koyunda yalnızca deri altı vurulur, damardan KESİNLİKLE verilmez!), Albendazol (ilk 45 gün yavru attırır, gebe koyuna verilmez!).
   - Süt ve et arınma süreleri için saat/dakika canlı geri sayım.

4. **Sağımcı Ekranı (Büyük Puntolu Hızlı Kontrol):**
   - Sağımhane için büyük puntolu "SAĞIMA UYGUN" veya "BU KOYUNU TANKA SAĞMA" onayı. Mezbaha kesim kilitleri anlık listelenir.

5. **Kuzu Hayatta Tutma & İlk Ağız Sütü (Kolostrum):**
   - İlk 2 saatte en az 300–400 mL (2 çay bardağı) koyu ağız sütü kuralı, Brix ağız sütü kalite ölçümü ve kuzu ishalinde sıvı/can suyu hesabı.

6. **Koç Katımı, Tohumlama & Doğum Çarkı:**
   - 17 gün aşım döngüsü, 35 gün ultrason, 120 gün doğuma hazırlık/çelerme pekiştirme aşısı ve 150 gün doğum (kuzulama) geri sayımı.

7. **Yemlik, İşkembe Ekşimesi & Geviş Sayacı:**
   - Geviş getirme oranı kontrolü (%58-60 hedefi), koyun fındığı/zibin kıvamı (1-5) ve koyun başı günlük 15-30 gram karbonat hesabı.

8. **Şerit Metre ile Koyun Canlı Kilo Ölçer:**
   - Kantar yokken mezurayla göğüs çevresi ve boydan küçükbaş Schaeffer formülü ile canlı ağırlık tahmini ve otomatik ilaç dozajı.

9. **Akıllı Aşı Takvimi & Hatırlatıcı:**
   - Çelerme (Yem Çarpması), Çiçek, Veba (PPR), Şap ve Brucella aşıları için takvim ve rapel süreleri.

10. **Hastalık Masrafı & Dökülen Süt Zarar Defteri:**
    - Çiğ koyun sütü litre fiyatı üzerinden dökülen sütün ve veteriner tedavilerinin ekonomik maliyet analizi.

11. **Güvenli JSON Yedekleme & Geri Yükleme:**
    - Tüm koyun, kuzu ve aşı kayıtlarınızı tek tıkla cihazınıza JSON olarak indirin veya yeni telefona aktarın. %100 yerel ve güvenli.
