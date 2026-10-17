# Süt Çiftliği Rehberi (Offline-First & PWA)

**Canlı Yayın (Web & Mobil PWA):** [https://mserman90.github.io/sut-saglik-rehberi/](https://mserman90.github.io/sut-saglik-rehberi/)  
**GitHub Deposu:** [https://github.com/mserman90/sut-saglik-rehberi](https://github.com/mserman90/sut-saglik-rehberi)  
**Detaylı Kullanım Kılavuzu:** [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

Bu uygulama, **en eski ve en basit akıllı telefonlardan masaüstü/dizüstü bilgisayarlara kadar** her cihazda **hiçbir internet bağlantısı veya sunucu kurulumu gerektirmeden** çalışan, Progressive Web App (PWA) mimarili çevrimdışı (%100 offline) bir **süt sığırı sağlığı, sağımhane kontrolü, İKAS süt arınma süresi, buzağı bakımı ve üreme takip asistanıdır**.

---

## Nasıl Çalıştırılır & Kurulur?

1. **Cep Telefonunda (Android / iOS):**
   - [https://mserman90.github.io/sut-saglik-rehberi/](https://mserman90.github.io/sut-saglik-rehberi/) adresini tarayıcınızda açın.
   - Tarayıcı menüsünden *"Ana Ekrana Ekle"* (Add to Home Screen) veya *"Uygulamayı Yükle"* seçeneğine dokunun.
   - Uygulama telefonun yerel hafızasına yüklenir. İnternetsiz dağda, yaylada ve baz istasyonunun çekmediği bodrum ahırlarda bağımsız, tam ekran ve jet hızında çalışır.

2. **Bilgisayarda:**
   - [`index.html`](./index.html) dosyasına çift tıklayarak tarayıcınızda doğrudan çalıştırabilirsiniz.

---

## Saha Öncelikli Durum Merkezleri (Status Hubs)

Uygulama arayüzü, ahır koşullarındaki **acil müdahale önceliği** ve tek elle eldivenli kullanıma göre optimize edilmiştir. Sayfa altındaki karmaşık gezinme çubukları kaldırılarak ana ekranda 5 büyük **Hayvan Durumu Ana Menüsü** merkezine dönüştürülmüştür:

1. **HASTA / ACİL İNEK:** İlk Yardım (Süt humması, Rahim düşmesi, İşkembe Gaz Şişmesi gaz şişmesi, Adrenalin şok dozu), Hasta Muayenesi & Durum Tespiti & Makat Ateşi Muayenesi, İlaç Yap & Süt Kilitle (İKAS).
2. **SAĞIM & SÜT GÜVENLİĞİ:** Sağımcı Ekranı (Dev puntolu yüksek kontrastlı siyah-beyaz süt izni), Dökülen Süt Zarar & Masraf Defteri.
3. **YENİ DOĞUM, BUZAĞI & GEBELİK:** Buzağı Kolostrum Brix Kalite Ölçer, İshal Sıvı & Serum Hesabı, Suni Tohumlama & Doğum Çarkı.
4. **YENİ İNEK / SÜRÜYE GİRİŞ & AŞI:** Yeni İnek Kaydı (Karantina Bölmesi), Akıllı Aşı Takvimi & Hatırlatıcı.
5. **YEMLİK, İŞKEMBE & GEVİŞ TAKİBİ:** Geviş Getirme Sayacı (%58-60 hedef), Tezek Skoru (1-5), Tampon Karbonat Dozlayıcı.

---

## Gösterge Paneli & Küpe Numaralı Kritik Takip

- **Suni Tohumlama Zamanı Göstergesi:** Önceki tohumlamadan sonra 18–24 gün geçmiş (21 günlük kızgınlık döngüsü) inekler ile 14–24 aylık damızlık düveler otomatik hesaplanır. Tek dokunuşla tohumlama takvimine yönlendirir.
- **Uyarılı Küpe Numaraları Çipleri:** Kritik takip listesinde kafa karıştırıcı sayılar yerine doğrudan hayvanların **Kulak Küpe Numaraları** listelenir.
- **Hayvan Uyarı & Sağlık Kartı Modalı:** Herhangi bir küpeye tıklandığında hayvana ait süt yasağı, kesim kilidi, yaklaşan aşı, tohumlama durumu veya sağlık uyarısı tek ekranda açılır; ilgili aksiyon butonlarıyla doğrudan müdahaleye imkan tanır.
- **Kategori Filtreleme:** Uyarılı hayvanları *Tümü*, *İlaç & İKAS*, *Üreme & Doğum*, *Aşı* ve *Sağlık & Karantina* olarak tek dokunuşla süzebilirsiniz.

---

## Barındırdığı Temel Süt Sığırcılığı Saha Modülleri

0. **& Eller Serbest Sesli Küpe Sorgulama ve Barkod/QR Okuma:**
   - **Sesli Küpe Sorgulama (Web Speech API):** Sağımhanede eller çamurlu, ıslak veya eldivendeyken ekrana dokunmadan *"yüz kırk beş"* veya *"TR 16 00 12"* deyin. Sistem hayvanı anında bulur ve hoparlörden sesli olarak yanıtlar: *"Kırmızı Alarm! 145 numaralı ineğin sütü yasaklı! Tanka sağmayın! Kalan süre: 36 saat"* veya *"145 temiz, sağıma uygundur, tanka dökülebilir."*
   - **Barkod & QR Kamera Okuma:** Hayvan arama, muayene, ilaç/İKAS, sağımhane kontrolü ve yeni inek ekleme ekranlarında yerel kamera kütüphanesiyle küpeleri otomatik okur (%100 offline).

1. **Acil İlk Yardım & Hayat Kurtarma:**
   - **Süt Humması (Doğum Felci):** Kalsiyum boroglukonat damardan serumla yavaşça verilmesi, göğüs üstü sabitleme.
   - **Rahim Düşmesi / Döl Yatağı Çıkması:** Temiz tuzlu bezle yukarı kaldırma, saman balyası desteği.
   - **İşkembe Gazı ve Şişmesi:** Sonda salma, bitkisel sıvı yağ içirme ve trokar müdahalesi.
   - **Aşı Şoku (Alerji Şoku):** Kiloya göre otomatik hayat kurtaran Adrenalin dozu (her 45 kg için 1 mL 1:1000).
   - **Buzağı Canlandırma:** Balgam temizliği, ters eğme, saman çöpü uyarısı ve göbek kordonu bakımı.

2. **Ahırda Muayene & Durum Tespiti:**
   - Makat ateşi (Normal: 38.0–39.3 °C), kalp/nabız, solunum, işkembe hareketleri ve nefes, öksürük ve zatürre puanlama sistemi.

3. **İlaç Yap & Süt Kilitle (İKAS):**
   - Merck Vet uyumlu ilaç ve meme tüpü kataloğu. Canlı saat/dakika geri sayımı, kombine tedavilerde en uzun süreyi baz alma.

4. **Sağımcı Ekranı (Büyük Puntolu Hızlı Kontrol):**
   - Sağımhane çalışanları için küpeyi yazınca veya okutunca dev ekranda "SAĞIMA UYGUN" veya "BU İNEĞİ TANKA SAĞMA" uyarısı. Mezbaha kesim kilitleri anlık listelenir.

5. **Buzağı Hayatta Tutma & İlk Ağız Sütü:**
   - İlk 2 saatte en az 3-4 litre kaliteli ağız sütü kuralı, Brix ağız sütü kalite ölçer kalite tablosu ve ishalli buzağıda kuruma derecesine göre 24 saatlik serum/can suyu hesaplayıcı.

6. **Tohumlama & Doğum Çarkı:**
   - 21. gün kızgınlık dönüşü, 40. gün gebelik muayenesi, 220. gün kuruya alma ve 280. gün beklenen buzağılama günü takibi.

7. **Yemlik, İşkembe & Geviş Sayacı:**
   - Yemden 2 saat sonra geviş getiren ineklerin oranı (Hedef: %58-60), tezek kıvamı (1-5) ve sürü bazında günlük sodyum bikarbonat (karbonat) ihtiyacı hesabı.

8. **Dökülen Süt Zarar & Masraf Defteri:**
   - Çiğ süt litre fiyatı üzerinden antibiyotikli dökülen sütlerin ve veteriner tedavilerinin net ekonomik zarar hesabı.

9. **Güvenli JSON Yedekleme & Geri Yükleme:**
   - Tüm çiftlik verilerini tek tıkla cihazınıza JSON olarak indirin veya yeni telefona aktarın. %100 yerel ve güvenli.
