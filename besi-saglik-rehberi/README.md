# Besi Çiftliği Rehberi (Offline-First & PWA)

**Canlı Yayın (Web & Mobil PWA):** [https://mserman90.github.io/besi-saglik-rehberi/](https://mserman90.github.io/besi-saglik-rehberi/)  
**GitHub Deposu:** [https://github.com/mserman90/besi-saglik-rehberi](https://github.com/mserman90/besi-saglik-rehberi)  
**Detaylı Kullanım Kılavuzu:** [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

Bu uygulama, **en eski ve en basit akıllı telefonlardan masaüstü/dizüstü bilgisayarlara kadar** her cihazda **hiçbir internet bağlantısı veya sunucu kurulumu gerektirmeden** çalışan, Progressive Web App (PWA) mimarili çevrimdışı (%100 offline) bir **besi danacılığı, 21 günlük karşılama protokolü, CAAG günlük kilo artışı, Et İKAS mezbaha kilitleri ve acil müdahale asistanıdır**.

---

## Nasıl Çalıştırılır & Kurulur?

1. **Cep Telefonunda (Android / iOS):**
   - [https://mserman90.github.io/besi-saglik-rehberi/](https://mserman90.github.io/besi-saglik-rehberi/) adresini telefonunuzda açın.
   - Tarayıcı menüsünden *"Ana Ekrana Ekle"* (Add to Home Screen) veya *"Uygulamayı Yükle"* seçeneğine dokunun.
   - Uygulama telefonun yerel belleğine yüklenir. İnternetsiz dağda, yaylada ve bodrum ahırlarda bağımsız, tam ekran ve jet hızında çalışır.

2. **Bilgisayarda:**
   - [`index.html`](./index.html) dosyasına çift tıklayarak tarayıcınızda doğrudan çalıştırabilirsiniz.

---

## Saha Öncelikli Durum Merkezleri (Status Hubs)

Besi ahırı şartlarındaki **acil müdahale önceliği** ve tek elle eldivenli kullanıma göre optimize edilmiştir. Sayfa altındaki gezinme ikonları yerine ana ekranda 4 büyük **Dana Durumu Ana Menüsü** merkezi yer alır:

1. **HASTA / ACİL DANA:** İlk Yardım (CCN/Tiamin eksikliği, İdrar Taşı/Sidik zoru, Besi arpa vurması (tırnak iltihabı)i, İşkembe Gaz Şişmesi şişmesi, Adrenalin şok dozu), BRD Solunum Muayenesi & DART Triyajı, İlaç Yap & Kesim Kilitle (Et İKAS).
2. **YENİ DANA GİRİŞ & 21 GÜN KARŞILAMA:** Kamyondan indirme ilk 24 saat altın kuralları, dinlenme can suyu, toplu koruyucu ciğer iğnesi ciğer kalkanı, iç-dış parazit ve kademeli 21 günlük rasyon tablosu.
3. **KİLO, CAAG & MEZBAHA GELİRİ:** Kantar/baskül tartımı veya şerit metre ölçümü (Schaeffer formülü), Günlük Canlı Ağırlık Artışı (CAAG kg/gün), %58 Karkas Randımanı ve Mezbaha Satış Geliri simülatörü.
4. **YEMLİK, ASİDOZ & MASRAF DEFTERİ:** Geviş getirme indeksi (%58-60 hedef), tezek skoru (1-5), tampon karbonat dozlayıcı (150-250 gr/dana), aşı takvimi ve fire/masraf defteri.

---

## Gösterge Paneli & Küpe Numaralı Kritik Takip

- **Anlık Sürü İstatistikleri:** Toplam Besi Mevcudu, Kesim Kilitli Danalar (Et İKAS), 21 Günlük Karşılamadaki Danalar ve Günü Gelen Aşılar tek bakışta görülür.
- **Uyarılı Küpe Numaraları Çipleri:** Sayfa başındaki kritik takip listesinde kafa karıştırıcı sayılar yerine doğrudan danaların **Kulak Küpe Numaraları** listelenir.
- **Dana Uyarı & Sağlık Kartı Modalı:** Herhangi bir küpeye dokunulduğunda dananın Et İKAS kesim kilidi, alıştırma günü, yaklaşan aşısı veya sağlık uyarısı tek ekranda açılır; ilgili butona dokunarak doğrudan eyleme geçilebilir.
- **Kategori Filtreleme:** Uyarılı danaları *Tümü*, *Kesim Kilitli (Et İKAS)*, *Aşı & Parazit*, *Sağlık & Karantina* olarak tek dokunuşla süzebilirsiniz.

---

## Barındırdığı Temel Besi Danacılığı Modülleri

0. **& Eller Serbest Sesli Küpe Sorgulama ve Barkod/QR Okuma:**
   - **Sesli Küpe Sorgulama (Web Speech API):** Besi ahırında eller çamurlu veya yem tozuyken ekrana dokunmadan *"yüz kırk beş"* veya *"TR 16 00 12"* deyin. Sistem danayı anında bulur ve hoparlörden sesli olarak yanıtlar: *"Dikkat! 145 numaralı danada aktif kesim kilidi var. Mezbaha kısıtı: 18 gün"* veya *"145 temiz, kesime uygundur."*
   - **Barkod & QR Kamera Okuma:** Dana arama, muayene, ilaç/Et İKAS, tartım ve yeni hayvan ekleme ekranlarında yerel kamera kütüphanesiyle küpeleri otomatik okur (%100 offline).

1. **Acil İlk Yardım & Besi Hastalıkları (Merck Vet Entegreli):**
   - **Besi Danası CCN / Polio:** Yüksek tahıl ve asidoz sonrası B1 Tiamin eksikliği, yıldız gözleme ilk yardımı.
   - **İdrar Taşı & Sidik Zoru (Ürolitiyazis):** Peniste tuz kristalleri, amonyum klorür ve idrar kesesi patlamasını (su karnı) önleme.
   - **Arpa Vurması / Ayak Yanması (Tırnak İltihabı):** Akut asidoz ve histamin felcinde yemliği boşaltma, karbonat içirme, yangı giderici ve soğuk su banyosu.
   - **İşkembe Gazı ve Şişmesi:** Mide sondası salma, bitkisel sıvı yağ içirme ve trokarla şişleme.
   - **Yemek Borusu Tıkanması:** Patates/pancar boğulmasında boğaz oluğu masajı.
   - **Canlı Ağırlık Adrenalin Hesaplayıcı:** Aşı şoku durumunda anında mL dozu verir.

2. **Muayene & Nefes/Zatürre Kontrolü:**
   - Makat ateşi ölçümü (38.0–39.3°C), nabız, solunum ve hastalık ve nefes puanıyla otomatik nakliye humması / zatürre derecelendirmesi.

3. **Yeni Dana Giriş & 21 Günlük Karşılama Protokolü:**
   - Kamyondan iner inmez ilk 24 saatte kesinlikle kesif yem verilmemesi, ılık can suyu (tuz + karbonat + pekmez), toplu koruyucu ciğer iğnesi ciğer kalkanı, iç-dış parazit ve kademeli 21 günlük rasyon tablosu.

4. **Canlı Ağırlık & CAAG (Günlük Kilo Artışı) Motoru:**
   - Kantar/baskül tartımı veya mezurayla şerit metre ölçümü (Schaeffer formülü: $G^2 \times U / 108.38$).
   - İki tartım arası Günlük Canlı Ağırlık Artışı (CAAG kg/gün).
   - Canlı ağırlığa göre otomatik ilaç dozu ve kuru madde ihtiyacı.
   - %58 Karkas Randımanı Simülatörü ve mezbaha satış geliri hesabı.

5. **Et İKAS & Mezbaha / Kesim Kilitleri:**
   - Vurulan antibiyotik ve ilaçların et arınma sürelerini takip eder. Kesim kilidi bitene kadar dananın kesime veya kasaba gönderilmesini engeller.

6. **Yemlik Yönetimi, Tezek Skoru & Tampon Dozlama:**
   - Yatan danaların geviş getirme indeksi ($\ge \%58$ kuralı).
   - 1–5 Tezek kıvamı ve bütün tahıl tanesi kaçağı denetimi.
   - Bunk skoru (artık yem %3–5).
   - Dana başına günlük 150–250 gr tampon karbonat (sodyum bikarbonat) dozlayıcı.

7. **Aşı & Parazit Takvimi:**
   - Şap, LSD Çiçek, Çelerme / Yem Çarpması (Bağırsak Zehirlenmesi), BRD karma solunum aşısı ve İvermektin iç-dış parazit takvimi.

8. **Besi Masraf & Fire Defteri:**
   - Veteriner ve ilaç harcamalarıyla birlikte, hastalık yüzünden yaşanan canlı ağırlık kaybı / duraklama firesini hesaplayıp toplam ekonomik zararı kuruşu kuruşuna gösterir.

9. **Güvenli JSON Yedekleme & Geri Yükleme:**
   - Tüm besi danalarınızı, tartımlarınızı ve aşılarınızı tek tıkla cihazınıza JSON olarak indirin veya yeni telefona aktarın. %100 yerel ve güvenli.
