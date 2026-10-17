# Besi Sağlık Asistanı (Offline-First & PWA)

**Canlı Yayın (Web & Mobil PWA):** [https://mserman90.github.io/besi-saglik-rehberi/](https://mserman90.github.io/besi-saglik-rehberi/)  
**GitHub Deposu:** [https://github.com/mserman90/besi-saglik-rehberi](https://github.com/mserman90/besi-saglik-rehberi)  
**Detaylı Kullanım Kılavuzu:** [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

Bu uygulama, **en eski ve en basit akıllı telefonlardan masaüstü/dizüstü bilgisayarlara kadar** her cihazda **hiçbir internet bağlantısı, sunucu veya harici API anahtarı gerektirmeden** çalışan, Progressive Web App (PWA) mimarili çevrimdışı (%100 offline) bir **besi danacılığı, adım adım etkileşimli sohbet tabanlı klinik sağlık teşhisi, sesli kantar & mezbaha Et İKAS kesim kilitleri, 21 gün dana karşılama ve CAAG karkas randıman asistanıdır**.

---

## Nasıl Çalıştırılır & Kurulur?

1. **Cep Telefonunda (Android / iOS):**
   - [https://mserman90.github.io/besi-saglik-rehberi/](https://mserman90.github.io/besi-saglik-rehberi/) adresini telefonunuzda açın.
   - Tarayıcı menüsünden *"Ana Ekrana Ekle"* (Add to Home Screen) veya *"Uygulamayı Yükle"* seçeneğine dokunun.
   - Uygulama telefonun yerel belleğine yüklenir. İnternetsiz dağda, yaylada ve bodrum ahırlarda bağımsız, tam ekran ve jet hızında çalışır.

2. **Bilgisayarda:**
   - [`index.html`](./index.html) dosyasına çift tıklayarak tarayıcınızda doğrudan çalıştırabilirsiniz.

---

## Barındırdığı Temel Besi Danacılığı Modülleri

1. **Adım Adım Etkileşimli Diyalog ve Klinik Sohbet:**
   - Dana grubu seçimi (Besi Başlangıç 200-300 kg, Besi Büyütme 300-450 kg, Besi Bitirme / Mezbaha Adayı 450-650+ kg, Kamyondan Yeni İnen Dana).
   - Rektal makat ateşi sorgusu (38.0–39.3°C fizyolojik aralık) ve otomatik puanlama.
   - 10 kritik besi hastalığı ve acil müdahale algoritması (BRD Akciğer Yangısı / Nakliye Humması, Arpa Vurması / Laminitis, İdrar Taşı / Sidik Zoru, CCN / Beyin Dönmesi & B1 Tiamin eksikliği, İşkembe Gaz Şişmesi / Bloat, Çelerme / Enterotoksemi, Akut/Subakut Rumen Asidozu, Tırnak Çürüğü / Flegmon, Yemek Borusu Boğulması, Şap Hastalığı).
   - Renk kodlu klinik ön teşhis kartı, acil ilk yardım yapılacaklar ve kesinlikle yapılmayacaklar listesi ile tek tıkla veteriner hekime iletilebilir hazır rapor çıktısı.

2. **🎙️ Sesli Kantar & Mezbaha Kesim Yasağı Kontrolü (`Kantar` Modalı):**
   - Kantarda tartılan dananın küpe numarasını girin veya mikrofona söyleyin (Web Speech API).
   - Sistem danada aktif **Et İKAS mezbaha kesim yasağı kilidi** olup olmadığını denetler ve Türkçe sesli uyarır (*"Dikkat! 145 numaralı danada kesim kilidi var..."* veya *"Temiz, kesime uygundur"*).
   - Aktif kesim kilitli danaların kalan günlerini canlı geri sayımla listeler.

3. **🚚 21 Günlük Dana Karşılama & Can Suyu Protokolü (`21 Gün` Modalı):**
   - Kamyondan inen yorgun danalar için ilk 24 saat altın kuralı.
   - 100 Litrelik acil ahır tipi Can Suyu formülü (Kaya tuzu, yemek karbonatı, melas/pekmez).
   - 21 günlük kademeli rasyon ve sağlık alıştırma tablosu.

4. **⚖️ Kilo, CAAG & Karkas Randımanı Hesaplayıcı (`Randıman` Modalı):**
   - **Schaeffer Şerit Metre Formülü:** Kantar olmayan ahırlarda göğüs çevresi ve vücut uzunluğuyla canlı ağırlık hesabı ($G^2 \times U / 108.38$).
   - **CAAG ve Karkas Analizi:** İki tartım arası Günlük Canlı Ağırlık Artışı (kg/gün), %58 karkas randımanı ve tahmini mezbaha satış geliri simülatörü.

5. **📋 Besi Defteri & Kesim Kilitleri (Et İKAS - `Kilit` Modalı):**
   - Vurulan antibiyotik ve ilaçların et arınma sürelerini takip eder (Oksitetrasiklin 28g, Florfenikol 28g, Tilmikosin 42g, Tulitromisin 18g, Flunuksin 4g, İvermektin 28g).
   - Kesim kilidi bitene kadar dananın kasaba sevk edilmesini engelleyen akıllı sayaç.

6. **🌡️ Rektal Derece Skalası (`Derece` Modalı):**
   - Normal, hipotermi/çöküş ve yüksek ateş sınırları için anında durum analizi.

---

## Güvenlik ve Uyumluluk

- **%100 Offline & Anahtarsız:** Hiçbir dış API anahtarına veya sunucuya bağımlı değildir.
- **Ergonomi (WCAG 2.5.5):** Dokunmatik butonlar en az 48x48 px boyutundadır.
- **Vektörel Standart:** SVG ikonlar doğrudan inline yerleştirilmiş olup harici font dosyası indirmez.
