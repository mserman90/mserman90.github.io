import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DAIRY_SHEEP_NRC_TABLES,
  DAIRY_SHEEP_FEEDS_DB,
  BREED_DEFAULTS,
  getDairySheepFeedById,
  validateDairySheepFeedSafety,
  calculateCheeseYield,
  getMilkEnergyPerKg,
  getMilkMpPerKg,
  calculateDairySheepRequirements,
  evaluateDairySheepRisks,
  solveDairySheepRation,
  DAIRY_SHEEP_PRESETS
} from "./dairy-sheep-engine.js";

describe("Sağmal Koyun Ustası — NRC 2007 & INRA 2018 Birim Testleri (36 Test)", () => {
  // 1. Veritabanı ve Tablo Bütünlüğü
  it("1. NRC 2007 sağmal koyun tabloları eksiksiz yüklenmeli", () => {
    assert.ok(DAIRY_SHEEP_NRC_TABLES);
    assert.equal(DAIRY_SHEEP_NRC_TABLES.copper_tolerance.max_mg_per_kg_dm, 15);
    assert.equal(DAIRY_SHEEP_NRC_TABLES.lactation.ME_Mcal.per_kg_milk.fat_6_5_pct, 1.32);
    assert.equal(DAIRY_SHEEP_NRC_TABLES.lactation.MP_g.per_kg_milk.protein_5_5_pct, 55);
  });

  it("2. Yem veritabanında en az 55 yem olmalı ve her yemde mg_pct_km ile sagmal_uygun bulunmalı", () => {
    assert.ok(DAIRY_SHEEP_FEEDS_DB.length >= 55);
    for (const feed of DAIRY_SHEEP_FEEDS_DB) {
      assert.equal(typeof feed.mg_pct_km, "number", `${feed.id} için mg_pct_km eksik`);
      assert.equal(typeof feed.sagmal_uygun, "boolean", `${feed.id} için sagmal_uygun eksik`);
      assert.equal(typeof feed.cu_mg_kg_km, "number", `${feed.id} için cu_mg_kg_km eksik`);
    }
  });

  it("3. Sağmal koyuna özel yemler (koyun_sut_yemi, magnezyum_oksit, sigir_sut_yemi) tanımlı olmalı", () => {
    const ksy = getDairySheepFeedById("koyun_sut_yemi");
    const mgo = getDairySheepFeedById("magnezyum_oksit");
    const ssy = getDairySheepFeedById("sigir_sut_yemi");
    assert.ok(ksy && ksy.sagmal_uygun === true);
    assert.ok(mgo && mgo.mg_pct_km >= 50);
    assert.ok(ssy && ssy.sagmal_uygun === false && ssy.cu_mg_kg_km > 20);
  });

  // 2. Referans Doğrulama: 55 kg İvesi, 1.5 L süt, %6.5 yağ, orta laktasyon (±%5 NRC 2007)
  it("4. Referans Doğrulama: 55 kg İvesi, 1.5 L süt, %6.5 yağ için Kuru Madde Tüketimi (DMI) NRC 2007 değerine ±%5 yakın olmalı", () => {
    const ref = DAIRY_SHEEP_NRC_TABLES.reference_validation_55kg_ivesi_1_5L;
    const req = calculateDairySheepRequirements({
      donem: "orta",
      irk: "ivesi",
      canli_agirlik_kg: 55,
      sut_verimi_l: 1.5,
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5
    });
    const diffPct = Math.abs((req.dmiKg - ref.expected_dmi_kg) / ref.expected_dmi_kg) * 100;
    assert.ok(diffPct <= 5.0, `DMI sapması %${diffPct.toFixed(2)} > %5 (${req.dmiKg} vs ${ref.expected_dmi_kg})`);
  });

  it("5. Referans Doğrulama: 55 kg İvesi, 1.5 L süt, %6.5 yağ için Toplam ME (Mcal/gün) NRC 2007 değerine ±%5 yakın olmalı", () => {
    const ref = DAIRY_SHEEP_NRC_TABLES.reference_validation_55kg_ivesi_1_5L;
    const req = calculateDairySheepRequirements({
      donem: "orta",
      irk: "ivesi",
      canli_agirlik_kg: 55,
      sut_verimi_l: 1.5,
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5
    });
    const diffPct = Math.abs((req.totalMeMcal - ref.expected_me_total_mcal) / ref.expected_me_total_mcal) * 100;
    assert.ok(diffPct <= 5.0, `ME sapması %${diffPct.toFixed(2)} > %5 (${req.totalMeMcal} vs ${ref.expected_me_total_mcal})`);
  });

  it("6. Referans Doğrulama: 55 kg İvesi, 1.5 L süt için hedef HP (% KM) ve MP (g/gün) NRC 2007 değerine ±%5 yakın olmalı", () => {
    const ref = DAIRY_SHEEP_NRC_TABLES.reference_validation_55kg_ivesi_1_5L;
    const req = calculateDairySheepRequirements({
      donem: "orta",
      irk: "ivesi",
      canli_agirlik_kg: 55,
      sut_verimi_l: 1.5,
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5
    });
    const hpDiffPct = Math.abs((req.targetHpPct - ref.expected_hp_pct_dm) / ref.expected_hp_pct_dm) * 100;
    const mpDiffPct = Math.abs((req.totalMpG - ref.expected_mp_g) / ref.expected_mp_g) * 100;
    assert.ok(hpDiffPct <= 5.0, `HP sapması %${hpDiffPct.toFixed(2)} > %5`);
    assert.ok(mpDiffPct <= 5.0, `MP sapması %${mpDiffPct.toFixed(2)} > %5`);
  });

  // 3. Koyun Sütü Zenginliği ve Peynir Randımanı
  it("7. Koyun sütü enerjisi yağ oranına göre doğru artmalı (%6.5 -> 1.32, %7.5 -> 1.42, %8.5 -> 1.52 Mcal/kg)", () => {
    assert.equal(getMilkEnergyPerKg(6.5), 1.32);
    assert.equal(getMilkEnergyPerKg(7.5), 1.42);
    assert.equal(getMilkEnergyPerKg(8.5), 1.52);
  });

  it("8. Koyun sütü MP ihtiyacı protein oranına göre doğru artmalı (%5.5 -> 55 g, %6.5 -> 65 g)", () => {
    assert.equal(getMilkMpPerKg(5.5), 55);
    assert.equal(getMilkMpPerKg(6.5), 65);
  });

  it("9. Peynir randımanı hesabı: 1.5 L süt (%6.5 yağ, %5.5 protein) günde ~278 g koyun peyniri vermeli", () => {
    const cheese = calculateCheeseYield(1.5, 6.5, 5.5, 50);
    assert.equal(cheese.yieldPerLiterG, 185);
    assert.equal(cheese.dailyCheeseGPerEwe, 278);
    assert.ok(cheese.dailyCheeseKgFlock > 13.5);
  });

  it("10. Süt yağı ve proteini arttığında 1 litre sütten çıkan peynir miktarı artmalı", () => {
    const normal = calculateCheeseYield(1.0, 6.5, 5.5, 1);
    const rich = calculateCheeseYield(1.0, 8.0, 6.5, 1);
    assert.ok(rich.yieldPerLiterG > normal.yieldPerLiterG);
  });

  // 4. Görünmez Zorunlu Kısıt 1: Bakır (Cu) Zehirlenmesi Koruması
  it("11. Sığır premiksi (sigir_premiksi / vit_min_premiks) seçildiğinde engellenmeli ve koyun_premiksi ile değiştirilmeli", () => {
    const res1 = validateDairySheepFeedSafety("sigir_premiksi");
    const res2 = validateDairySheepFeedSafety("vit_min_premiks");
    assert.equal(res1.allowed, false);
    assert.equal(res1.replacementFeedId, "koyun_premiksi");
    assert.equal(res2.allowed, false);
    assert.equal(res2.replacementFeedId, "koyun_premiksi");
  });

  it("12. Sığır süt yemi (sigir_sut_yemi / sut_yemi_19 / sut_yemi_21) seçildiğinde engellenmeli ve koyun_sut_yemi ile değiştirilmeli", () => {
    const res1 = validateDairySheepFeedSafety("sigir_sut_yemi");
    const res2 = validateDairySheepFeedSafety("sut_yemi_19");
    assert.equal(res1.allowed, false);
    assert.equal(res1.replacementFeedId, "koyun_sut_yemi");
    assert.equal(res2.allowed, false);
    assert.equal(res2.replacementFeedId, "koyun_sut_yemi");
  });

  it("13. Kullanıcı yanlışlıkla sığır premiksi ve sığır süt yemi seçse bile çözülen rasyonda Bakır <= 15 mg/kg KM olmalı", () => {
    const result = solveDairySheepRation({
      donem: "orta",
      sut_verimi_l: 1.8,
      canli_agirlik_kg: 58,
      secilen_yemler: ["yonca_kuru", "arpa_ezmesi", "sigir_sut_yemi", "sigir_premiksi"]
    });
    assert.ok(result.summary.copperMgKgDm <= 15.0, `Bakır sınırı aşıldı: ${result.summary.copperMgKgDm}`);
    assert.ok(result.summary.blockedCattleFeeds.length >= 2);
    assert.ok(!result.items.some((x) => x.id === "sigir_premiksi" || x.id === "sigir_sut_yemi"));
  });

  it("14. Rasyonda Molibden (Mo) her zaman >= 0.5 mg/kg KM olmalı", () => {
    const result = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    assert.ok(result.summary.molybdenumMgKgDm >= 0.5);
  });

  // 5. Görünmez Zorunlu Kısıt 2: Gebelik Toksemisi (İkiz Kuzu Hastalığı) Koruması
  it("15. Yakın kuru dönemde ikiz gebe koyunun gebelik enerjisi tek kuzuluya göre +%35 artmalı", () => {
    const single = calculateDairySheepRequirements({
      donem: "kuru_yakin",
      kuru_hafta: 4,
      fetus_sayisi: 1,
      canli_agirlik_kg: 60
    });
    const twin = calculateDairySheepRequirements({
      donem: "kuru_yakin",
      kuru_hafta: 4,
      fetus_sayisi: 2,
      canli_agirlik_kg: 60
    });
    const ratio = twin.mePregnancyMcal / single.mePregnancyMcal;
    assert.ok(Math.abs(ratio - 1.35) < 0.02);
  });

  it("16. Yakın kuru dönemde üçüz gebe koyunun gebelik enerjisi tek kuzuluya göre +%55 artmalı", () => {
    const single = calculateDairySheepRequirements({
      donem: "kuru_yakin",
      kuru_hafta: 4,
      fetus_sayisi: 1,
      canli_agirlik_kg: 60
    });
    const triplet = calculateDairySheepRequirements({
      donem: "kuru_yakin",
      kuru_hafta: 4,
      fetus_sayisi: 3,
      canli_agirlik_kg: 60
    });
    const ratio = triplet.mePregnancyMcal / single.mePregnancyMcal;
    assert.ok(Math.abs(ratio - 1.55) < 0.02);
  });

  it("17. Yakın kuru dönemde çok yağlı koyun (VKS >= 4.0) için kırmızı Gebelik Toksemisi uyarısı üretilmeli", () => {
    const result = solveDairySheepRation({
      donem: "kuru_yakin",
      kuru_hafta: 3,
      fetus_sayisi: 2,
      vks: 4.2,
      canli_agirlik_kg: 65
    });
    assert.equal(result.risks.gebelikToksemisi.level, "red");
    assert.ok(result.warnings.some((w) => w.includes("Gebelik Toksemisi")));
  });

  it("18. Yeni doğum yapmış (0-2 hafta) ve iştahsız (istahli_mi: 'hayir') koyunda acil kırmızı Gebelik Toksemisi uyarısı çıkmalı", () => {
    const result = solveDairySheepRation({
      donem: "yeni_dogum",
      yeni_dogum_gun: "1_3",
      istahli_mi: "hayir",
      ayaga_kalkabiliyor_mu: "evet",
      sut_verimi_l: 1.2,
      canli_agirlik_kg: 55
    });
    assert.equal(result.risks.gebelikToksemisi.level, "red");
    assert.ok(result.risks.gebelikToksemisi.message.includes("propilen glikol"));
  });

  // 6. Görünmez Zorunlu Kısıt 3: Süt Ateşi (Hipokalsemi) ve Mastitis Koruması
  it("19. Yeni doğum yapmış (0-2 hafta) ve ayağa kalkamayan koyunda acil kırmızı Süt Ateşi uyarısı çıkmalı", () => {
    const result = solveDairySheepRation({
      donem: "yeni_dogum",
      yeni_dogum_gun: "1_3",
      istahli_mi: "evet",
      ayaga_kalkabiliyor_mu: "hayir",
      sut_verimi_l: 1.5,
      canli_agirlik_kg: 58
    });
    assert.equal(result.risks.sutAtesi.level, "red");
    assert.ok(result.risks.sutAtesi.message.includes("damar içi kalsiyum"));
  });

  it("20. Sağmal dönemlerde Kalsiyum / Fosfor (Ca:P) oranı 2.0:1 ile 2.5:1 arasında olmalı", () => {
    const result = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    assert.ok(
      result.summary.caPRatio >= 1.95 && result.summary.caPRatio <= 2.55,
      `Ca:P oranı sınır dışında: ${result.summary.caPRatio}`
    );
  });

  it("21. Yakın kuru dönemde (doğuma 3 hafta) veya süt ateşi geçmişi olduğunda Mermer Tozu kesilmeli", () => {
    const result = solveDairySheepRation(DAIRY_SHEEP_PRESETS.kuru_donem_ikiz.input);
    assert.ok(!result.items.some((x) => x.id === "mermer_tozu"));
  });

  it("22. Magnezyum (Mg) oranı gebelik toksemisi ve süt ateşini önlemek için >= %0.25 KM olmalı", () => {
    const result = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    assert.ok(result.summary.mgPctDm >= 0.25, `Mg düşük: ${result.summary.mgPctDm}`);
    assert.ok(result.items.some((x) => x.id === "magnezyum_oksit"));
  });

  it("23. Mastitis sağlık sorunu seçildiğinde kırmızı Mastitis uyarısı üretilmeli", () => {
    const result = solveDairySheepRation({
      ...DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input,
      saglik_sorunlari: ["mastitis"]
    });
    assert.equal(result.risks.mastitisRisk.level, "red");
    assert.ok(result.warnings.some((w) => w.includes("dezenfekte")));
  });

  // 7. Özel Akışlar: Emzirme + Sağım, İlk Doğum (Şişek), Yüksek Verim (2 L+)
  it("24. Hem sağılıp hem kuzu emziren koyunda (sagim_arti_1_kuzu / sagim_arti_2_kuzu) enerji ve protein ihtiyacı artmalı", () => {
    const milkOnly = calculateDairySheepRequirements({
      donem: "erken",
      sut_verimi_l: 1.5,
      emzirme_durumu: "sadece_sagim",
      canli_agirlik_kg: 58
    });
    const milkPlus1 = calculateDairySheepRequirements({
      donem: "erken",
      sut_verimi_l: 1.5,
      emzirme_durumu: "sagim_arti_1_kuzu",
      canli_agirlik_kg: 58
    });
    const milkPlus2 = calculateDairySheepRequirements({
      donem: "erken",
      sut_verimi_l: 1.5,
      emzirme_durumu: "sagim_arti_2_kuzu",
      canli_agirlik_kg: 58
    });
    assert.ok(milkPlus1.totalMeMcal > milkOnly.totalMeMcal);
    assert.ok(milkPlus2.totalMeMcal > milkPlus1.totalMeMcal);
    assert.ok(milkPlus2.totalMpG > milkPlus1.totalMpG);
  });

  it("25. İlk doğumunu yapan genç koyunda (dogum_sayisi: 1 veya donem: ilk_dogum) +0.8 Mcal büyüme enerjisi eklenmeli", () => {
    const mature = calculateDairySheepRequirements({
      donem: "orta",
      sut_verimi_l: 1.3,
      dogum_sayisi: 2,
      canli_agirlik_kg: 50
    });
    const firstParity = calculateDairySheepRequirements({
      donem: "orta",
      sut_verimi_l: 1.3,
      dogum_sayisi: 1,
      canli_agirlik_kg: 50
    });
    assert.equal(firstParity.meGrowthMcal, 0.8);
    assert.ok(firstParity.totalMeMcal > mature.totalMeMcal);
  });

  it("26. Yüksek verimli koyunda (2.5 L süt) Korunmuş Yağ ve Sodyum Bikarbonat (Karbonat) rasyona dahil edilmeli", () => {
    const result = solveDairySheepRation(DAIRY_SHEEP_PRESETS.sakiz_yuksek_2_5L.input);
    assert.ok(result.items.some((x) => x.id === "korunmus_yag"));
    assert.ok(result.items.some((x) => x.id === "karbonat_tampon"));
  });

  // 8. Sert Kısıtlar (Hard Constraints)
  it("27. Sağmal dönemde kaba yem oranı >= %40 KM, kuru dönemde >= %70 KM olmalı", () => {
    const lact = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    const dry = solveDairySheepRation(DAIRY_SHEEP_PRESETS.kuru_donem_ikiz.input);
    assert.ok(lact.summary.foragePctDm >= 40.0, `Sağmal kaba yem %${lact.summary.foragePctDm} < %40`);
    assert.ok(dry.summary.foragePctDm >= 70.0, `Kuru dönem kaba yem %${dry.summary.foragePctDm} < %70`);
  });

  it("28. NDF oranı her zaman %30 ile %42 KM arasında kalmalı", () => {
    for (const preset of Object.values(DAIRY_SHEEP_PRESETS)) {
      const res = solveDairySheepRation(preset.input);
      assert.ok(
        res.summary.ndfPctDm >= 30.0 && res.summary.ndfPctDm <= 42.0,
        `${preset.id} NDF sınır dışında: ${res.summary.ndfPctDm}`
      );
    }
  });

  it("29. Tahıllar (Arpa/Mısır) kesif yemin %50'sini geçmemeli", () => {
    for (const preset of Object.values(DAIRY_SHEEP_PRESETS)) {
      const res = solveDairySheepRation(preset.input);
      assert.ok(
        res.summary.grainInConcPct <= 50.0,
        `${preset.id} tahıl/kesif oranı %${res.summary.grainInConcPct} > %50`
      );
    }
  });

  it("30. Pamuk tohumu küspesi seçildiğinde toplam kuru maddenin %10'unu geçmemeli", () => {
    const res = solveDairySheepRation({
      donem: "orta",
      sut_verimi_l: 1.6,
      canli_agirlik_kg: 55,
      secilen_yemler: ["yonca_kuru", "arpa_ezmesi", "pamuk_tohumu_kuspesi"]
    });
    const ptk = res.items.find((x) => x.id === "pamuk_tohumu_kuspesi");
    assert.ok(!ptk || ptk.dmPct <= 10.0, `Pamuk küspesi %${ptk?.dmPct} > %10`);
  });

  it("31. Tuz oranı her zaman >= %0.4 KM olmalı", () => {
    const res = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    const salt = res.items.find((x) => x.id === "yem_tuzu");
    assert.ok(salt && salt.dmPct >= 0.4);
  });

  // 9. Çevre, Mera, Fiyat ve 6 Hazır Senaryo Testleri
  it("32. Merada otlayan ve soğukta kalan koyunun enerji ihtiyacı kapalı ağıldakinden yüksek olmalı", () => {
    const indoor = calculateDairySheepRequirements({
      donem: "orta",
      sut_verimi_l: 1.5,
      canli_agirlik_kg: 55,
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal"
    });
    const pastureCold = calculateDairySheepRequirements({
      donem: "orta",
      sut_verimi_l: 1.5,
      canli_agirlik_kg: 55,
      barinma: "acik_agil",
      mera_durumu: "tam_mera",
      hava_durumu: "soguk"
    });
    assert.ok(pastureCold.totalMeMcal > indoor.totalMeMcal);
  });

  it("33. Kullanıcı yem fiyatını değiştirdiğinde (fiyat_overrides) günlük yem maliyeti ve net kâr güncellenmeli", () => {
    const base = solveDairySheepRation(DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input);
    const expensive = solveDairySheepRation({
      ...DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input,
      fiyat_overrides: { yonca_kuru: 15.0, koyun_sut_yemi: 22.0 }
    });
    assert.ok(expensive.summary.dailyCostTlPerEwe > base.summary.dailyCostTlPerEwe);
    assert.ok(expensive.summary.dailyNetProfitPerEweTl < base.summary.dailyNetProfitPerEweTl);
  });

  it("34. Süt yağı/proteini 'bilmiyorum' seçildiğinde ırka göre varsayılan değerler atanmalı", () => {
    const reqKivircik = calculateDairySheepRequirements({
      donem: "orta",
      irk: "kivircik",
      sut_verimi_l: 1.2,
      sut_yag_pct: "bilmiyorum",
      sut_protein_pct: "bilmiyorum"
    });
    assert.equal(reqKivircik.sutYagPct, BREED_DEFAULTS.kivircik.defaultFatPct);
    assert.equal(reqKivircik.sutProteinPct, BREED_DEFAULTS.kivircik.defaultProteinPct);
  });

  it("35. Aşı durumu 'hayir' olduğunda Enterotoksemi (Çelerme) aşısı uyarısı üretilmeli", () => {
    const res = solveDairySheepRation({
      ...DAIRY_SHEEP_PRESETS.ivesi_orta_1_5L.input,
      asi_durumu: "hayir"
    });
    assert.ok(res.warnings.some((w) => w.includes("Enterotoksemi")));
  });

  it("36. Altı hazır senaryonun (DAIRY_SHEEP_PRESETS) tamamı hatasız çözülmeli ve Cu <= 15 mg/kg KM sağlamalı", () => {
    const keys = Object.keys(DAIRY_SHEEP_PRESETS);
    assert.equal(keys.length, 6);
    for (const key of keys) {
      const res = solveDairySheepRation(DAIRY_SHEEP_PRESETS[key].input);
      assert.ok(res.items.length >= 4, `${key} yem listesi eksik`);
      assert.ok(res.summary.copperMgKgDm <= 15.0, `${key} bakır sınırı aşıldı`);
      assert.ok(res.summary.dailyCostTlPerEwe > 0, `${key} maliyet sıfır olamaz`);
    }
  });
});
