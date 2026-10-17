import test from "node:test";
import assert from "node:assert/strict";
import {
  SHEEP_NRC_TABLES,
  SHEEP_FEEDS_DB,
  calculateSheepRequirements,
  solveSheepRation,
  validateCattlePremixSelection,
  evaluateAdgRealism
} from "./sheep-engine.js";

test("1. Yem veritabanında en az 45 yerleşik yem bulunmalı", () => {
  assert.ok(
    SHEEP_FEEDS_DB.length >= 45,
    `Beklenen >= 45 yem, bulunan: ${SHEEP_FEEDS_DB.length}`
  );
});

test("2. KRİTİK VERİ: Veritabanındaki her yem için bakır (cu_mg_kg_km) ve molibden (mo_mg_kg_km) değerleri zorunlu olmalı", () => {
  for (const f of SHEEP_FEEDS_DB) {
    assert.equal(
      typeof f.cu_mg_kg_km,
      "number",
      `${f.id} yeminde cu_mg_kg_km eksik`
    );
    assert.equal(
      typeof f.mo_mg_kg_km,
      "number",
      `${f.id} yeminde mo_mg_kg_km eksik`
    );
    assert.equal(
      typeof f.koyun_uygun,
      "boolean",
      `${f.id} yeminde koyun_uygun alanı eksik`
    );
  }
});

test("3. 25 kg erkek kuzu, 250 g/gün hedefle hesaplanan ihtiyaçlar NRC 2007 tablo değerleriyle ±%5 içinde uyuşmalı", () => {
  const ref = SHEEP_NRC_TABLES.reference_validation_25kg_250g_male_lamb;
  const req = calculateSheepRequirements(
    {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefAdg_g: 250,
      hedefSure: 90,
      barinma: "kapali"
    },
    true
  );

  const dmiDiffPct =
    Math.abs((req.dmiKg - ref.expected_dmi_kg) / ref.expected_dmi_kg) * 100;
  const meDiffPct =
    Math.abs(
      (req.meTotalMcal - ref.expected_me_total_mcal) / ref.expected_me_total_mcal
    ) * 100;
  const hpDiffPct =
    Math.abs(
      (req.targetHpPct - ref.expected_hp_pct_dm) / ref.expected_hp_pct_dm
    ) * 100;

  assert.ok(dmiDiffPct <= 5.0, `KM farkı ±%5 içinde olmalı: %${dmiDiffPct.toFixed(2)}`);
  assert.ok(meDiffPct <= 5.0, `ME farkı ±%5 içinde olmalı: %${meDiffPct.toFixed(2)}`);
  assert.ok(hpDiffPct <= 5.0, `HP farkı ±%5 içinde olmalı: %${hpDiffPct.toFixed(2)}`);
});

test("4. 25 kg erkek kuzu, 250 g/gün hedefle çözülen rasyon NRC 2007 değerleriyle ±%5 içinde uyuşmalı", () => {
  const ref = SHEEP_NRC_TABLES.reference_validation_25kg_250g_male_lamb;
  const sonuc = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefAdg_g: 250,
      hedefSure: 90,
      barinma: "kapali",
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [
      { yemId: "koyun_premiksi" },
      { yemId: "yem_tuzu" },
      { yemId: "amonyum_klorur" }
    ],
    serbestYemleme: true
  });

  const dmDiffPct =
    Math.abs((sonuc.kuruMaddeKg - ref.expected_dmi_kg) / ref.expected_dmi_kg) * 100;
  const meDensDiffPct =
    Math.abs(
      (sonuc.me_mcal_kg_km - ref.expected_me_density_mcal_kg_dm) /
        ref.expected_me_density_mcal_kg_dm
    ) * 100;

  assert.ok(dmDiffPct <= 5.0, `Rasyon KM farkı ±%5 içinde olmalı: %${dmDiffPct.toFixed(2)}`);
  assert.ok(
    meDensDiffPct <= 5.0,
    `Rasyon ME yoğunluğu farkı ±%5 içinde olmalı: %${meDensDiffPct.toFixed(2)}`
  );
});

test("5. Bakır (Cu) hiçbir senaryoda 15 mg/kg KM sınırını aşmamalı (Zorunlu Kısıt)", () => {
  const senaryolar = [
    { tip: "kuzu", ortalamaCanliAgirlik: 20, cinsiyet: "erkek", hedefAdg_g: 280 },
    { tip: "toklu", ortalamaCanliAgirlik: 40, cinsiyet: "karisik", hedefAdg_g: 200 },
    { tip: "sisek", ortalamaCanliAgirlik: 50, cinsiyet: "disi", hedefAdg_g: 150 },
    { tip: "koyun", ortalamaCanliAgirlik: 65, cinsiyet: "disi", donem: "gebe_son", emzirdigiKuzuSayisi: 2 }
  ];

  for (const h of senaryolar) {
    const res = solveSheepRation({
      hayvan: h,
      kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "misir_silaji" }],
      kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }, { yemId: "bugday_kepegi" }],
      katkiMaddeleri: [{ yemId: "sigir_premiksi" }, { yemId: "melas" }]
    });
    assert.ok(
      res.cu_mg_kg_km <= 15.0,
      `Bakır 15 mg/kg KM'yi aşmamalı, hesaplanan: ${res.cu_mg_kg_km}`
    );
    assert.equal(res.riskler.bakirZehirlenme, "yesil");
  }
});

test("6. Sığır mineral premiksi seçilirse uygulama uyarı verip kullanıcıyı engellemeli ve Koyun Premiksi ile değiştirmeli", () => {
  const check = validateCattlePremixSelection("sigir_premiksi");
  assert.equal(check.allowed, false);
  assert.equal(check.replacementFeedId, "koyun_premiksi");
  assert.ok(check.message.includes("Sığır premiksi kullanma"));

  const res = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }],
    katkiMaddeleri: [{ yemId: "sigir_premiksi" }]
  });

  assert.ok(!res.kalemler.some((k) => k.id === "sigir_premiksi"));
  assert.ok(res.kalemler.some((k) => k.id === "koyun_premiksi"));
  assert.ok(res.uyarilar.some((u) => u.includes("Sığır mineral premiksi KULLANMA")));
});

test("7. Erkek kuzuda idrar taşı kontrolü otomatik devreye girmeli (Ca:P >= 2:1, Tuz >= %0,5, Amonyum Klorür eklenmeli)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefSatisKilo: 45,
      hedefSure: 90
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.ok(res.ca_p_pct >= 2.0, `Erkek kuzuda Ca:P >= 2.0 olmalı: ${res.ca_p_pct}`);
  assert.ok(res.tuz_pct >= 0.5, `Erkek kuzuda Tuz >= %0.5 olmalı: %${res.tuz_pct}`);
  assert.ok(
    res.kalemler.some((k) => k.id === "amonyum_klorur"),
    "Erkek kuzuda Amonyum Klorür otomatik eklenmeli"
  );
  assert.equal(res.riskler.idrarTasi, "yesil");
  assert.ok(res.uyarilar.some((u) => u.includes("idrar taşı riski var")));
});

test("8. Karışık cinsiyetli sürüde de idrar taşı koruması zorunlu olarak aktif olmalı", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 28,
      cinsiyet: "karisik",
      hedefSatisKilo: 46,
      hedefSure: 90
    },
    kabaYemler: [{ yemId: "cayir_otu" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });

  assert.ok(res.ca_p_pct >= 2.0);
  assert.ok(res.kalemler.some((k) => k.id === "amonyum_klorur"));
  assert.equal(res.riskler.idrarTasi, "yesil");
});

test("9. Dişi kuzularda idrar taşı riski 'gecersiz' olarak işaretlenmeli", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "disi",
      hedefSatisKilo: 42,
      hedefSure: 90
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.equal(res.riskler.idrarTasi, "gecersiz");
});

test("10. NDF hiçbir senaryoda %25'in altına, %45'in üstüne çıkmamalı", () => {
  const resLowFiberAttempt = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek", hedefSure: 60, hedefSatisKilo: 45 },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "misir_kirmasi" }, { yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });
  assert.ok(resLowFiberAttempt.ndf_pct >= 25.0 && resLowFiberAttempt.ndf_pct <= 45.0);

  const resHighFiberAttempt = solveSheepRation({
    hayvan: { tip: "sisek", ortalamaCanliAgirlik: 45, cinsiyet: "disi", hedefSure: 120, hedefSatisKilo: 60 },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "cayir_otu" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });
  assert.ok(resHighFiberAttempt.ndf_pct >= 25.0 && resHighFiberAttempt.ndf_pct <= 45.0);
});

test("11. Kaba yem KM payı hızlı besi senaryosunda bile %30'un altına düşmemeli", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefSure: 60,
      hedefSatisKilo: 45
    },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "misir_kirmasi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.ok(
    res.kabaKesifOrani[0] >= 30,
    `Kaba yem oranı >= %30 olmalı, bulunan: %${res.kabaKesifOrani[0]}`
  );
});

test("12. Gebe koyun (son 2 ay) seçilirse enerji ve protein otomatik artmalı ve gebelik toksemisi uyarısı verilmeli", () => {
  const reqBos = calculateSheepRequirements({
    tip: "koyun",
    ortalamaCanliAgirlik: 60,
    donem: "bos",
    hedefAdg_g: 100
  });
  const reqGebeSon = calculateSheepRequirements({
    tip: "koyun",
    ortalamaCanliAgirlik: 60,
    donem: "gebe_son",
    emzirdigiKuzuSayisi: 2
  });

  assert.ok(
    reqGebeSon.meTotalMcal >= reqBos.meTotalMcal * 1.3,
    "Son 2 ay gebe koyunda enerji en az +%30 artmalı"
  );
  assert.ok(
    reqGebeSon.targetHpPct > reqBos.targetHpPct,
    "Son 2 ay gebe koyunda protein hedefi artmalı"
  );

  const res = solveSheepRation({
    hayvan: {
      tip: "koyun",
      ortalamaCanliAgirlik: 60,
      cinsiyet: "disi",
      donem: "gebe_son",
      emzirdigiKuzuSayisi: 2
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.ok(res.uyarilar.some((u) => u.includes("Gebelik Toksemisi")));
  assert.ok(res.riskler.gebelikToksemisi !== undefined);
});

test("13. Emziren koyun (2 kuzulu) seçildiğinde süt enerjisi (1.35 Mcal/kg) ve yüksek protein devreye girmeli", () => {
  const req1 = calculateSheepRequirements({
    tip: "koyun",
    ortalamaCanliAgirlik: 60,
    donem: "emziren_0_6",
    emzirdigiKuzuSayisi: 1
  });
  const req2 = calculateSheepRequirements({
    tip: "koyun",
    ortalamaCanliAgirlik: 60,
    donem: "emziren_0_6",
    emzirdigiKuzuSayisi: 2
  });

  assert.ok(req2.meTotalMcal > req1.meTotalMcal);
  assert.ok(req2.targetHpPct >= 16.0);
});

test("14. Enterotoksemi (çelerme) aşısı yoksa raporda uyarı çıkmalı ve risk göstergesi sarı/kırmızı olmalı", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      enterotoksemiAsili: false
    },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.ok(res.uyarilar.some((u) => u.includes("Enterotoksemi aşısı")));
  assert.notEqual(res.riskler.enterotoksemi, "yesil");
});

test("15. Pamuk tohumu küspesi gossypol riski nedeniyle toplam KM'nin %10'unu aşmamalı", () => {
  const res = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "pamuk_tohumu_kuspesi" }],
    katkiMaddeleri: []
  });

  const ptk = res.kalemler.find((k) => k.id === "pamuk_tohumu_kuspesi");
  if (ptk) {
    const sharePct = (ptk.kuruMaddeKg / res.kuruMaddeKg) * 100;
    assert.ok(sharePct <= 10.5, `Pamuk küspesi <= %10 KM olmalı: %${sharePct.toFixed(1)}`);
  }
});

test("16. 0–6 aylık kuzularda Yemlik Üre otomatik olarak engellenmeli", () => {
  const res = solveSheepRation({
    hayvan: { tip: "kuzu", yasGrubu: "0-3ay", ortalamaCanliAgirlik: 20, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "yemlik_ure" }],
    katkiMaddeleri: []
  });

  assert.ok(!res.kalemler.some((k) => k.id === "yemlik_ure"));
  assert.ok(res.uyarilar.some((u) => u.includes("Yemlik Üre")));
});

test("17. Toklu (6–12 ay) seçildiğinde kaba yem oranı %50–60 aralığında ve sabır uyarısı aktif olmalı", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "toklu",
      ortalamaCanliAgirlik: 40,
      cinsiyet: "erkek",
      hedefSatisKilo: 58,
      hedefSure: 90
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "bugday_samani" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: []
  });

  assert.ok(
    res.kabaKesifOrani[0] >= 50 && res.kabaKesifOrani[0] <= 62,
    `Tokluda kaba yem %50-60 olmalı: %${res.kabaKesifOrani[0]}`
  );
  assert.ok(res.uyarilar.some((u) => u.includes("Toklular kuzudan yavaş büyür")));
});

test("18. Hedef ADG tür için gerçekçi değilse (örn. kuzuda 420 g/gün) uyarı üretilmeli", () => {
  const check = evaluateAdgRealism("kuzu", 420);
  assert.equal(check.realistic, false);
  assert.ok(check.message.includes("çok yüksek"));
});

test("19. Molibden (Mo) seviyesi bakır emilimini dengelemek için >= 0,5 mg/kg KM olmalı", () => {
  const res = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.ok(res.mo_mg_kg_km >= 0.5, `Molibden >= 0.5 mg/kg KM olmalı: ${res.mo_mg_kg_km}`);
});

test("20. Açık ağıl ve Yayla/Mera seçildiğinde yaşama payı enerjisi (MEm) artmalı", () => {
  const kapali = calculateSheepRequirements({
    tip: "kuzu",
    ortalamaCanliAgirlik: 30,
    barinma: "kapali"
  });
  const acik = calculateSheepRequirements({
    tip: "kuzu",
    ortalamaCanliAgirlik: 30,
    barinma: "acik"
  });
  const yayla = calculateSheepRequirements({
    tip: "kuzu",
    ortalamaCanliAgirlik: 30,
    barinma: "yayla"
  });

  assert.ok(acik.meMaintMcal > kapali.meMaintMcal);
  assert.ok(yayla.meMaintMcal > kapali.meMaintMcal);
});

test("21. Erkek kuzuda 'idrar_yapamiyor' sağlık sorunu seçilirse acil durum uyarısı ve kırmızı risk verilmeli", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 26,
      cinsiyet: "erkek",
      saglikSorunlari: ["idrar_yapamiyor"]
    },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }],
    katkiMaddeleri: []
  });

  assert.equal(res.riskler.idrarTasi, "kirmizi");
  assert.ok(res.uyarilar.some((u) => u.includes("ACİL DURUM (İdrar Yapamıyor)")));
});

test("22. Topallık sağlık sorunu seçildiğinde Sodyum Bikarbonat otomatik eklenmeli", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 30,
      cinsiyet: "erkek",
      saglikSorunlari: ["topallik"]
    },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }],
    katkiMaddeleri: []
  });

  assert.ok(res.kalemler.some((k) => k.id === "karbonat_tampon"));
  assert.ok(res.uyarilar.some((u) => u.includes("Topallık")));
});

test("23. Sabah ve akşam öğün miktarlarının toplamı günlük toplam yem miktarına eşit olmalı", () => {
  const res = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "yem_tuzu" }]
  });

  for (const k of res.kalemler) {
    const sum = Number((k.sabahKg + k.aksamKg).toFixed(3));
    assert.equal(sum, k.miktarKg, `${k.ad} sabah+akşam toplamı günlük miktara eşit olmalı`);
  }
});

test("24. Sürü sayısı (örn. 50 kuzu) girildiğinde toplu sürü maliyeti doğru ölçeklenmeli", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      suruSayisi: 50,
      hedefSure: 90,
      hedefSatisKilo: 45
    },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });

  assert.equal(res.maliyet.toplamSuruTL, res.maliyet.sureToplamTekTL * 50);
});

test("25. Kullanıcı özel yem fiyatı girdiğinde maliyet hesabında o fiyat kullanılmalı", () => {
  const resDefault = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: []
  });
  const resExpensive = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [{ yemId: "yonca_kuru", fiyat: 20 }],
    kesifYemler: [{ yemId: "arpa_ezmesi", fiyat: 25 }, { yemId: "soya_46", fiyat: 40 }],
    katkiMaddeleri: []
  });

  assert.ok(resExpensive.maliyet.gunlukTekTL > resDefault.maliyet.gunlukTekTL);
});

test("26. Senaryo 1 Doğrulaması: Erken besi kuzusu (25 kg -> 45 kg, 90 gün)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefSatisKilo: 45,
      hedefSure: 90,
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "yem_tuzu" }, { yemId: "amonyum_klorur" }]
  });

  assert.equal(res.hedefAdg_g, 222);
  assert.ok(res.cu_mg_kg_km <= 15);
  assert.equal(res.riskler.idrarTasi, "yesil");
  assert.equal(res.riskler.bakirZehirlenme, "yesil");
});

test("27. Senaryo 2 Doğrulaması: Hızlı besi kuzusu (25 kg -> 42 kg, 60 gün)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "kuzu",
      ortalamaCanliAgirlik: 25,
      cinsiyet: "erkek",
      hedefSatisKilo: 42,
      hedefSure: 60,
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "misir_kirmasi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "amonyum_klorur" }, { yemId: "karbonat_tampon" }]
  });

  assert.equal(res.hedefAdg_g, 283);
  assert.ok(res.kabaKesifOrani[0] >= 30);
  assert.ok(res.ndf_pct >= 25);
});

test("28. Senaryo 3 Doğrulaması: Toklu yavaş besi (40 kg -> 55 kg, 120 gün)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "toklu",
      ortalamaCanliAgirlik: 40,
      cinsiyet: "erkek",
      hedefSatisKilo: 55,
      hedefSure: 120,
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "cayir_otu" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "atk_36" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "yem_tuzu" }]
  });

  assert.equal(res.hedefAdg_g, 125);
  assert.ok(res.kabaKesifOrani[0] >= 50);
});

test("29. Senaryo 4 Doğrulaması: Gebe koyun (son 2 ay)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "koyun",
      ortalamaCanliAgirlik: 62,
      cinsiyet: "disi",
      donem: "gebe_son",
      emzirdigiKuzuSayisi: 2,
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "cayir_otu" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "yem_tuzu" }]
  });

  assert.ok(res.hp_pct >= 14.0);
  assert.ok(res.uyarilar.some((u) => u.includes("Gebelik Toksemisi")));
});

test("30. Senaryo 5 Doğrulaması: Emziren koyun (2 kuzulu)", () => {
  const res = solveSheepRation({
    hayvan: {
      tip: "koyun",
      ortalamaCanliAgirlik: 60,
      cinsiyet: "disi",
      donem: "emziren_0_6",
      emzirdigiKuzuSayisi: 2,
      enterotoksemiAsili: true
    },
    kabaYemler: [{ yemId: "yonca_kuru" }, { yemId: "misir_silaji" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }, { yemId: "kuzu_besi_yemi" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "yem_tuzu" }]
  });

  assert.ok(res.kuruMaddeKg >= 2.2);
  assert.ok(res.hp_pct >= 15.0);
});

test("31. Hiç yem seçilmese bile motor çökmeden güvenli kuzu rasyonu üretmeli", () => {
  const res = solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek" },
    kabaYemler: [],
    kesifYemler: [],
    katkiMaddeleri: []
  });

  assert.ok(res.kalemler.length >= 4);
  assert.ok(res.cu_mg_kg_km <= 15);
});

test("32. Performans: Rasyon hesaplama süresi 300 ms altında olmalı", () => {
  const t0 = performance.now();
  solveSheepRation({
    hayvan: { tip: "kuzu", ortalamaCanliAgirlik: 25, cinsiyet: "erkek", suruSayisi: 100 },
    kabaYemler: [{ yemId: "bugday_samani" }, { yemId: "yonca_kuru" }],
    kesifYemler: [{ yemId: "arpa_ezmesi" }, { yemId: "soya_46" }],
    katkiMaddeleri: [{ yemId: "koyun_premiksi" }, { yemId: "amonyum_klorur" }]
  });
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 300, `Hesaplama süresi < 300 ms olmalı: ${elapsed.toFixed(2)} ms`);
});
