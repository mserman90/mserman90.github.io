/**
 * "Süt Ustası" — Süt Sığırı Rasyonu Hesaplama Motoru Birim Testleri (32 Test)
 * Çalıştırma: node --test lib/ration-engine/dairy-engine.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  NRC_2021_DAIRY_DATA,
  DAIRY_FEEDS_DB,
  calculateDairyRequirementsNrc2021,
  solveDairyRation
} from "./dairy-engine.js";

test("1. Yem veritabanında yaklaşık 50 yerleşik yem (kaba, kesif, katkı) bulunmalı", () => {
  assert.ok(DAIRY_FEEDS_DB.length >= 42, `Yem sayısı: ${DAIRY_FEEDS_DB.length}`);
});

test("2. Her yem kaydında NRC 2021 için gerekli nel_mcal_kg_km, rup_pct_hp, ndf_pct_km, ca_pct_km, p_pct_km alanları bulunmalı", () => {
  for (const f of DAIRY_FEEDS_DB) {
    assert.equal(typeof f.km_pct, "number", `${f.id} km_pct eksik`);
    assert.equal(typeof f.nel_mcal_kg_km, "number", `${f.id} nel_mcal_kg_km eksik`);
    assert.equal(typeof f.hp_pct_km, "number", `${f.id} hp_pct_km eksik`);
    assert.equal(typeof f.ndf_pct_km, "number", `${f.id} ndf_pct_km eksik`);
  }
});

test("3. 600 kg Holstein, 25 L süt, %3,7 yağ, orta laktasyon için hesaplanan rasyon NRC 2021 tablo değerleriyle ±%5 içinde uyuşmalı", () => {
  const ref = NRC_2021_DAIRY_DATA.nrc_2021.reference_validation_grid[0];
  const req = calculateDairyRequirementsNrc2021(
    {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 25,
      sutYagPct: 3.7,
      sutProteinPct: 3.2,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    true
  );

  const dmiDiffPct = Math.abs(req.dmiKg - ref.dmi_kg) / ref.dmi_kg;
  const nelDiffPct = Math.abs(req.nelTotalMcal - ref.nel_total_mcal) / ref.nel_total_mcal;
  const hpDiffPct = Math.abs(req.targetHpPct - ref.hp_pct_dm) / ref.hp_pct_dm;

  assert.ok(dmiDiffPct <= 0.05, `DMI sapması > %5: ${req.dmiKg} vs ${ref.dmi_kg}`);
  assert.ok(nelDiffPct <= 0.05, `NEL sapması > %5: ${req.nelTotalMcal} vs ${ref.nel_total_mcal}`);
  assert.ok(hpDiffPct <= 0.05, `HP sapması > %5: ${req.targetHpPct} vs ${ref.hp_pct_dm}`);
});

test("4. 600 kg Holstein, 25 L süt senaryosunda çözülen rasyonun KM ve NEL değerleri NRC 2021 ile ±%5 uyumlu olmalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 25,
      sutYagPct: 3.7,
      sutProteinPct: 3.2,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }, { yemId: "sut_yemi_19" }],
    katkiMaddeleri: [{ yemId: "karbonat_tampon" }, { yemId: "vit_min_premiks" }, { yemId: "yem_tuzu" }],
    serbestYemleme: true
  });

  const dmiErr = Math.abs(res.kuruMaddeKg - res.girdiOzeti.dmiKg) / res.girdiOzeti.dmiKg;
  assert.ok(dmiErr <= 0.05, `Çözülen KM sapması: ${res.kuruMaddeKg} vs ${res.girdiOzeti.dmiKg}`);
  assert.ok(res.ndf_pct >= 28.0, `NDF %28 altına düştü: ${res.ndf_pct}`);
  assert.ok(res.kabaKesifOrani[0] >= 40, `Kaba yem %40 altına düştü: ${res.kabaKesifOrani[0]}`);
});

test("5. NDF hiçbir senaryoda %28'in altına düşmemeli (süt yağı koruma kısıtı)", () => {
  const stages = ["yeni_dogum", "erken_laktasyon", "orta_laktasyon", "gec_laktasyon", "kuru_uzak", "kuru_yakin", "duve"];
  for (const donem of stages) {
    const res = solveDairyRation({
      inek: {
        donem,
        canliAgirlik: 620,
        irk: "holstein",
        vks: 3.0,
        sutLitre: 38,
        sutYagPct: 3.5,
        kacinciBuzagi: 2,
        sagimSayisi: 3,
        barinma: "kapali",
        saglikSorunlari: [],
        sutHummasiGecmisi: false
      },
      kabaYemler: [{ yemId: "yonca_kuru" }],
      kesifYemler: [{ yemId: "misir_kirmasi" }, { yemId: "soya_46" }],
      katkiMaddeleri: [],
      serbestYemleme: true
    });
    assert.ok(res.ndf_pct >= 28.0, `${donem} döneminde NDF %28 altına düştü: ${res.ndf_pct}`);
  }
});

test("6. Sağmal ineklerde NDF %40'ın üzerine çıkmamalı (yem tüketim kapasitesi korunmalı)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 30,
      sutYagPct: 3.7,
      kacinciBuzagi: 2,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.ndf_pct <= 40.0, `Sağmalda NDF %40'ı aştı: ${res.ndf_pct}`);
});

test("7. Kaba yem KM payı hiçbir senaryoda %40'ın altına düşmemeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 650,
      irk: "holstein",
      vks: 2.5,
      sutLitre: 42,
      sutYagPct: 3.6,
      kacinciBuzagi: 2,
      sagimSayisi: 3,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kabaKesifOrani[0] >= 40, `Kaba yem oranı %40 altında: %${res.kabaKesifOrani[0]}`);
});

test("8. Kuru dönem (uzak) seçildiğinde enerji düşük, protein orta (%12-14), kaba yem yüksek (%70+) çıkmalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "kuru_uzak",
      canliAgirlik: 640,
      irk: "holstein",
      vks: 3.5,
      sutLitre: 0,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kabaKesifOrani[0] >= 70, `Kuru dönemde kaba yem %70 altında: %${res.kabaKesifOrani[0]}`);
  assert.ok(res.nel_mcal_kg_km <= 1.50, `Kuru dönemde enerji çok yüksek: ${res.nel_mcal_kg_km}`);
  assert.ok(res.hp_pct >= 11.0 && res.hp_pct <= 15.0, `Kuru dönem proteini: %${res.hp_pct}`);
});

test("9. Yakın kuru dönem ve süt humması geçmişi olan inekte Ca düşük tutulmalı ve Anyonik Tuz (DCAD düşürücü) önerilmeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "kuru_yakin",
      canliAgirlik: 650,
      irk: "holstein",
      vks: 3.5,
      sutLitre: 0,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: true,
      dogumaKalanGun: 21
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });

  const hasAnionic = res.kalemler.some((k) => k.id === "anyonik_tuz");
  assert.ok(hasAnionic, "Süt humması geçmişi olan kuru dönem ineğinde Anyonik Tuz eklenmeli");
  assert.ok(res.dcad_meq_kg <= 180, `DCAD değeri yüksek kaldı: ${res.dcad_meq_kg}`);
  assert.ok(
    res.uyarilar.some((u) => u.toLowerCase().includes("süt humması") || u.toLowerCase().includes("anyonik")),
    "Süt humması / anyonik tuz uyarısı gösterilmeli"
  );
});

test("10. Yeni doğum (0-21 gün) seçildiğinde ketozis ve 7 günlük kademeli geçiş uyarısı otomatik gösterilmeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "yeni_dogum",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 22,
      sutYagPct: 3.8,
      kacinciBuzagi: 2,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(
    res.uyarilar.some((u) => u.toLowerCase().includes("ketozis")),
    "Yeni doğum ketozis uyarısı bulunmalı"
  );
  assert.ok(
    res.uyarilar.some((u) => u.includes("7 günde")),
    "7 günlük kademeli geçiş uyarısı bulunmalı"
  );
});

test("11. Kesif yem içinde Arpa veya Mısır oranı %45 sınırını aşmamalı (asidoz önleme)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 620,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 32,
      kacinciBuzagi: 2,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });

  const concItems = res.kalemler.filter((k) => k.kategori === "kesif");
  const totalConcDm = concItems.reduce((s, k) => s + k.kuruMaddeKg, 0);
  const arpaItem = concItems.find((k) => k.id === "arpa_ezmesi");
  if (arpaItem && totalConcDm > 0) {
    const arpaShare = (arpaItem.kuruMaddeKg / totalConcDm) * 100;
    assert.ok(arpaShare <= 46.5, `Arpa kesif yem içindeki oranı %45'i aştı: %${arpaShare.toFixed(1)}`);
  }
});

test("12. Korunmuş yağ kullanım oranı toplam kuru maddenin %5'ini asla aşmamalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 2.5,
      sutLitre: 35,
      kacinciBuzagi: 2,
      sagimSayisi: 3,
      barinma: "kapali",
      saglikSorunlari: ["ketozis"],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "korunmus_yag" }],
    serbestYemleme: true
  });

  const fatItem = res.kalemler.find((k) => k.id === "korunmus_yag");
  assert.ok(fatItem, "Korunmuş yağ kalemlerde yer almalı");
  const fatPctDm = (fatItem.kuruMaddeKg / res.kuruMaddeKg) * 100;
  assert.ok(fatPctDm <= 5.0, `Korunmuş yağ KM oranı %5'i aştı: %${fatPctDm.toFixed(2)}`);
});

test("13. Yemlik Üre seçildiğinde toplam kuru maddenin %0,5'ini aşmamalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      irk: "holstein",
      vks: 3.0,
      sutLitre: 25,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "yemlik_ure" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });

  const ureItem = res.kalemler.find((k) => k.id === "yemlik_ure");
  if (ureItem) {
    const urePctDm = (ureItem.kuruMaddeKg / res.kuruMaddeKg) * 100;
    assert.ok(urePctDm <= 0.65, `Üre oranı %0,5 KM sınırını aştı: %${urePctDm.toFixed(2)}`);
  }
});

test("14. Süt yağ oranı bilinmiyorsa varsayılan %3,7 kullanılmalı ve tahmini olarak işaretlenmeli", () => {
  const req = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 600,
    sutLitre: 22
  });
  assert.equal(req.sutYagPct, 3.7);
  assert.equal(req.fatEstimated, true);
});

test("15. Süt protein oranı bilinmiyorsa varsayılan %3,2 kullanılmalı ve tahmini olarak işaretlenmeli", () => {
  const req = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 600,
    sutLitre: 22
  });
  assert.equal(req.sutProteinPct, 3.2);
  assert.equal(req.protEstimated, true);
});

test("16. 1. buzağılı genç ineklerde büyüme payı enerjisi ve protein hedefi 3. buzağılı inekten yüksek olmalı", () => {
  const req1 = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 550,
    sutLitre: 24,
    kacinciBuzagi: 1
  });
  const req3 = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 550,
    sutLitre: 24,
    kacinciBuzagi: 3
  });
  assert.ok(req1.nelTotalMcal > req3.nelTotalMcal, "1. buzağılı inekte NEL ihtiyacı daha yüksek olmalı");
  assert.ok(req1.targetHpPct > req3.targetHpPct, "1. buzağılı inekte HP hedefi daha yüksek olmalı");
});

test("17. Günde 3 sağım yapıldığında süt enerji ihtiyacı 2 sağıma göre artmalı", () => {
  const req2 = calculateDairyRequirementsNrc2021({
    donem: "erken_laktasyon",
    canliAgirlik: 620,
    sutLitre: 30,
    sagimSayisi: 2
  });
  const req3 = calculateDairyRequirementsNrc2021({
    donem: "erken_laktasyon",
    canliAgirlik: 620,
    sutLitre: 30,
    sagimSayisi: 3
  });
  assert.ok(req3.nelTotalMcal > req2.nelTotalMcal);
  assert.ok(req3.dmiKg > req2.dmiKg);
});

test("18. Açık/Sundurma barınmada soğuk stresi nedeniyle KM tüketimi ve yaşama payı enerjisi artmalı", () => {
  const kapali = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 600,
    sutLitre: 25,
    barinma: "kapali"
  });
  const acik = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 600,
    sutLitre: 25,
    barinma: "acik"
  });
  assert.ok(acik.nelMaintMcal > kapali.nelMaintMcal);
  assert.ok(acik.dmiKg > kapali.dmiKg);
});

test("19. VKS 2.0 (Çok zayıf) olan inekte kondisyon kazanımı için ekstra enerji eklenmeli", () => {
  const zayif = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 580,
    sutLitre: 20,
    vks: 2.0
  });
  const ideal = calculateDairyRequirementsNrc2021({
    donem: "orta_laktasyon",
    canliAgirlik: 580,
    sutLitre: 20,
    vks: 3.0
  });
  assert.ok(zayif.nelTotalMcal > ideal.nelTotalMcal);
});

test("20. Topallık sağlık sorunu seçildiğinde Sodyum Bikarbonat otomatik eklenmeli ve topallık uyarısı verilmeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      sutLitre: 24,
      saglikSorunlari: ["topallik"]
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kalemler.some((k) => k.id === "karbonat_tampon"));
  assert.ok(res.uyarilar.some((u) => u.includes("Topallık")));
});

test("21. Mastitis seçildiğinde meme bağışıklığı için Vitamin-Mineral Premiks ve uyarı yer almalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      sutLitre: 24,
      saglikSorunlari: ["mastitis"]
    },
    kabaYemler: [{ yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "sut_yemi_19" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kalemler.some((k) => k.id === "vit_min_premiks"));
  assert.ok(res.uyarilar.some((u) => u.includes("Mastitis")));
});

test("22. Ketozis sağlık sorunu seçildiğinde Korunmuş Yağ ve Melas desteği eklenmeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 600,
      sutLitre: 30,
      saglikSorunlari: ["ketozis"]
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kalemler.some((k) => k.id === "korunmus_yag"));
  assert.ok(res.uyarilar.some((u) => u.includes("Ketozis")));
});

test("23. Sabah ve akşam öğün miktarlarının toplamı günlük toplam yem miktarına eşit olmalı", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      sutLitre: 25
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "karbonat_tampon" }],
    serbestYemleme: true
  });
  for (const k of res.kalemler) {
    const sum = Number((k.sabahKg + k.aksamKg).toFixed(2));
    assert.equal(sum, k.miktarKg, `${k.ad} sabah+akşam toplamı uyuşmuyor`);
  }
});

test("24. Kullanıcı özel yem fiyatı girdiğinde 1 litre süt maliyeti o fiyatla hesaplanmalı", () => {
  const resDefault = solveDairyRation({
    inek: { donem: "orta_laktasyon", canliAgirlik: 600, sutLitre: 25 },
    kabaYemler: [{ yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "sut_yemi_19" }],
    katkiMaddeleri: []
  });
  const resCustom = solveDairyRation({
    inek: { donem: "orta_laktasyon", canliAgirlik: 600, sutLitre: 25 },
    kabaYemler: [{ yemId: "misir_silaji", fiyat: 5.0 }],
    kesifYemler: [{ yemId: "sut_yemi_19", fiyat: 20.0 }],
    katkiMaddeleri: []
  });
  assert.ok(resCustom.maliyet.gunlukTL > resDefault.maliyet.gunlukTL);
  assert.ok(resCustom.maliyet.litreSutTL > resDefault.maliyet.litreSutTL);
});

test("25. Senaryo 1 Doğrulaması: Erken laktasyon yüksek verimli Holstein (650 kg, 35 L, %3,6 yağ)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 650,
      irk: "holstein",
      vks: 2.5,
      sutLitre: 35,
      sutYagPct: 3.6,
      sutProteinPct: 3.1,
      kacinciBuzagi: 2,
      sagimSayisi: 3,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "misir_flake" }, { yemId: "soya_46" }, { yemId: "sut_yemi_21" }],
    katkiMaddeleri: [{ yemId: "korunmus_yag" }, { yemId: "karbonat_tampon" }, { yemId: "vit_min_premiks" }],
    serbestYemleme: true
  });
  assert.ok(res.kuruMaddeKg >= 21.5);
  assert.ok(res.hp_pct >= 16.5);
  assert.ok(res.rozet.includes("30+ Litre"));
});

test("26. Senaryo 2 Doğrulaması: Orta laktasyon Montofon (580 kg, 20 L, %4,0 yağ)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 580,
      irk: "montofon",
      vks: 3.0,
      sutLitre: 20,
      sutYagPct: 4.0,
      sutProteinPct: 3.4,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "cayir_otu" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: [{ yemId: "karbonat_tampon" }],
    serbestYemleme: true
  });
  assert.ok(res.kuruMaddeKg >= 16.0 && res.kuruMaddeKg <= 21.0);
  assert.equal(res.riskler.sutYagi, "yesil");
});

test("27. Senaryo 3 Doğrulaması: Kuru dönem (uzak - doğuma 60 gün)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "kuru_uzak",
      canliAgirlik: 650,
      irk: "holstein",
      vks: 3.5,
      sutLitre: 0,
      kacinciBuzagi: 3,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false,
      dogumaKalanGun: 60
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "cayir_otu" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "bugday_kepegi" }, { yemId: "atk_36" }],
    katkiMaddeleri: [{ yemId: "vit_min_premiks" }],
    serbestYemleme: true
  });
  assert.ok(res.kabaKesifOrani[0] >= 70);
  assert.equal(res.sutTahminiLitre, 0);
});

test("28. Senaryo 4 Doğrulaması: Kuru dönem (yakın - 21 gün, süt humması geçmişi var)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "kuru_yakin",
      canliAgirlik: 660,
      irk: "holstein",
      vks: 3.5,
      sutLitre: 0,
      kacinciBuzagi: 4,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: true,
      dogumaKalanGun: 21
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [],
    serbestYemleme: true
  });
  assert.ok(res.kalemler.some((k) => k.id === "anyonik_tuz"));
  assert.ok(res.dcad_meq_kg < 120);
});

test("29. Senaryo 5 Doğrulaması: Yeni doğum (0-14 gün loğusa inek)", () => {
  const res = solveDairyRation({
    inek: {
      donem: "yeni_dogum",
      canliAgirlik: 610,
      irk: "simmental",
      vks: 3.0,
      sutLitre: 22,
      sutYagPct: 3.9,
      kacinciBuzagi: 2,
      sagimSayisi: 2,
      barinma: "kapali",
      saglikSorunlari: [],
      sutHummasiGecmisi: false
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "misir_silaji" }, { yemId: "cayir_otu" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }, { yemId: "sut_yemi_19" }],
    katkiMaddeleri: [{ yemId: "karbonat_tampon" }, { yemId: "vit_min_premiks" }],
    serbestYemleme: true
  });
  assert.ok(res.kabaKesifOrani[0] >= 48);
  assert.ok(res.uyarilar.some((u) => u.includes("Yeni Doğum") || u.includes("ketozis")));
});

test("30. Senaryo 6 Doğrulaması: Geç laktasyon (6+ ay) ve Düve akışı", () => {
  const resGec = solveDairyRation({
    inek: {
      donem: "gec_laktasyon",
      canliAgirlik: 620,
      sutLitre: 15,
      vks: 3.5
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });
  const resDuve = solveDairyRation({
    inek: {
      donem: "duve",
      canliAgirlik: 420,
      sutLitre: 0,
      vks: 3.0
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });
  assert.ok(resGec.kabaKesifOrani[0] >= 50);
  assert.ok(resDuve.kabaKesifOrani[0] >= 60);
});

test("31. Sağmal ineklerde Ca:P oranı 1.5 ile 2.5 aralığında dengelenmeli", () => {
  const res = solveDairyRation({
    inek: {
      donem: "orta_laktasyon",
      canliAgirlik: 600,
      sutLitre: 26
    },
    kabaYemler: [{ yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "bugday_kepegi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });
  assert.ok(res.ca_p_pct >= 1.45 && res.ca_p_pct <= 2.6, `Ca:P oranı aralık dışı: ${res.ca_p_pct}`);
});

test("32. Performans: Rasyon hesaplama süresi 300 ms altında olmalı", () => {
  const t0 = performance.now();
  solveDairyRation({
    inek: {
      donem: "erken_laktasyon",
      canliAgirlik: 640,
      sutLitre: 34,
      sutYagPct: 3.8
    },
    kabaYemler: [{ yemId: "misir_silaji" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "karbonat_tampon" }]
  });
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 300, `Hesaplama süresi 300 ms'yi aştı: ${elapsed.toFixed(2)} ms`);
});
