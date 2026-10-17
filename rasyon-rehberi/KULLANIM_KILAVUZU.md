# 🌾 Yem & Rasyon Hazırlama Rehberi — Yetiştirici Başlangıç Kılavuzu

Bu uygulama; **Süt Sığırları**, **Besi Sığırları** ve **Koyun / Kuzular** için uluslararası besleme standartlarını (**NASEM 2021, NRC, CNCPS**) çiftlik pratiğine ve yetiştirici diline çeviren **%100 çevrimdışı (internetsiz)** bir rasyon hesaplama programıdır.

---

## İlk Defa Kullanacak Yetiştiriciler İçin: "Şimdi Nereden Başlamalıyım, Sonra Ne Yapmalıyım?"

### 1. ADIM: ŞİMDİ NEREDEN BAŞLAMALIYIM? (İlk 1 Dakika)
1. **Hayvan Türünüzü Seçin:** Ana ekrandaki **"1. Rasyon Kur"** sekmesinde en üstten hayvanınızı seçin: **1. Süt Sığırı**, **2. Besi Sığırı** veya **3. Koyun & Kuzu**.
2. **Kilo ve Hedef Verimi Yazın:** Hemen altındaki kutulara hayvanınızın **ortalama canlı kilosunu** (Örn: 600 kg süt ineği veya 400 kg besi danası) ve beklediğiniz **günlük süt verimini (litre)** veya **günlük canlı ağırlık artışını (kg/gün)** girin.
3. **Hazır Şablon Seçin (En Kolay Yöntem):** Sıfırdan tek tek yem aramak yerine **"Hazır Bölgesel Şablonlar"** kutusuna tıklayın ve kendi ahırınıza en yakın hazır reçeteyi (Örn: *"28 Lt Süt İneği - Mısır Silajlı"* veya *"20 Lt Süt İneği - Silaj Yok / Saman & Yoncalı"*) seçin.

---

### 2. ADIM: SONRA NE YAPMALIYIM? (Elimdeki Yemlere Göre Uyarlama)
1. **Elinizde Olmayan Yemi Çıkarın:** Şablon yüklendiğinde listede deponuzda bulunmayan bir yem varsa (örneğin *Yaş Pancar Posası* yoksa), o yemin karşısındaki **"Sil"** butonuna basıp rasyondan çıkarın.
2. **Deponuzdaki Yemi Ekleyin:** Listenin hemen altındaki **"+ Rasyona Yem Ekle"** kutusundan elinizde bulunan otu, samanı, arpayı, küspeyi veya fabrika yemini seçip **"+ Ekle"** butonuna basın.
3. **Önemli Bilgi:** Ekrana girdiğiniz tüm kilolar hayvanın önüne döktüğünüz **Gerçek Yaş Kilo (Natural kg)** değeridir. Yemlerin içindeki suyu program arka planda otomatik düşer.

---

### 3. ADIM: KİLOLARI NASIL DENGELEYECEĞİM? ("⚡ Otomatik Dengele" Butonu)
- Yemlerinizi seçtikten sonra **"⚡ OTOMATİK DENGELE (İHTİYACA GÖRE)"** butonuna bir kez dokunun.
- Program elinizdeki yemlerin kilolarını hayvanın işkembe kapasitesine, enerji, protein ve lif ihtiyacına göre saniyeler içinde kendi ayarlar.
- Dilerseniz her yemin yanındaki **"-0.5"** ve **"+0.5"** butonlarıyla kiloları elle de değiştirebilirsiniz.

---

### 4. ADIM: GÖSTERGE ÇUBUKLARINDA "EKSİK" VEYA "TEHLİKE" YAZARSA NE YAPMALIYIM?

Rasyonun altındaki **6 Besin Dengesi Çubuğu** size rasyonun karnesini verir. Hepsi **[ DENGELİ / UYGUN ]** olana kadar şu pratik kuralları uygulayın:

- **1. Kuru Madde (KMT) "EKSİK" ise:** Hayvanın karnı doymuyor demektir; kaba yem veya fabrika yemini artırın. **"FAZLA" ise:** Hayvan bu kadar yemi yiyemez, yemlikte yem artar; kiloları biraz düşürün.
- **2. Enerji ($NE_L$ / ME) "EKSİK" ise:** Süt düşer, hayvan zayıflar veya gebe koyunlarda *İkiz Gebelik Zehirlenmesi* olur. **Arpa, Mısır, Fabrika Yemi veya Mısır Silajını** artırın, kuru samanı azaltın.
- **3. Ham Protein (HP) "EKSİK" ise:** Süt ve et verimi düşer. **Soya Küspesi, Pamuk Küspesi, Ayçiçek Küspesi veya Yonca Otunu** artırın. **"FAZLA (>%19)" ise:** İneklerde döl tutmama (rahimde amonyak artışı) yapar ve cebinizden boşa para çıkar; küspeyi azaltın.
- **4. Etkili Lif ($peNDF$) "TEHLİKE / DÜŞÜK" ise:** Hayvan geviş getiremez, işkembe ekşir, süt yağı düşer ve tırnak vurması (laminitis) başlar! Hemen **Yonca, Çayır Otu veya Samanı +1 kg** artırın.
- **5. Nişasta & Şeker "TEHLİKE / YÜKSEK" ise:** Arpa, buğday veya mısır fazla kaçmıştır (İşkembe Asidozu riski!). Tahılları biraz kısıp rasyona **Yemek Sodası (Tampon)** ekleyin.
- **6. Kalsiyum / Fosfor ($Ca:P$) "TEHLİKE (<1.5)" ise:** Besi danaları ve erkek kuzularda **İdrar Taşı (Sidik Zoru)**, süt ineklerinde **Doğum Felci (Süt Humması)** tehlikesi vardır! Rasyona hemen **0.10 - 0.15 kg (100-150 gr) Mermer Tozu** ekleyin.

---

### 5. ADIM: RASYONU KURDUM, ŞİMDİ AHIRDA YEM KARMA VAGONUNA (TMR) NASIL DÖKECEĞİM?
1. Rasyonunuz dengelendikten sonra ekranın en altındaki menüden **"2. VAGON (TMR & Çuval)"** sekmesine geçin.
2. **Sürüdeki Hayvan Sayısını** (Örn: 40 baş) ve **Günlük Öğün Sayısını** (Örn: Sabah-Akşam 2 öğün) girin.
3. Program size:
   - Vagona yemleri **hangi sırayla** atacağınızı (*1. Kuru Ot/Saman → 2. Kesif Yem/Mineral → 3. Silaj/Yaş Posa*),
   - Her öğünde **kaç kilo** atacağınızı,
   - Vagonun **dijital kantarında sırasıyla hangi rakamı görmeniz gerektiğini** (Kümülatif Kantar Okuma) hazır liste olarak verir!
4. Kendi kesif yeminizi çiftlikte kırıp karıştırıyorsanız, aynı sayfanın altındaki **"1.000 kg (1 Ton) ve 50 kg Çuval Kesif Yem Reçetesi"** tablosunu kullanın.

---

### 6. ADIM: YEM FİYATLARINI GÜNCELLEME, KIYASLAMA VE KAYDETME
- **4. YEMLER Sekmesi:** Bölgenizdeki güncel yem fiyatlarını (₺/kg) buradan değiştirin; özel fabrika yeminiz varsa etiket değerlerini girip kütüphaneye ekleyin.
- **3. PRATİK (Pearson & Kıyas) Sekmesi:** Yemlerin içindeki suyu ayıklayarak **Gerçek 1 kg Kuru Madde** ve **1 kg Ham Protein** maliyetini kıyaslayın.
- **5. DEFTER Sekmesi:** Hazırladığınız rasyonu isim vererek kaydedin; istediğiniz zaman geri yükleyin veya **"Yazdır / PDF"** butonuyla kağıda döküp ahır duvarına asın.
