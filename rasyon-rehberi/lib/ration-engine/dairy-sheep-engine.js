/**
 * "Sağmal Koyun Ustası" — Süt Koyunu (Sağmal Koyun) Rasyonu Hesaplama Motoru
 * Bilimsel Temel: NRC 2007 (Nutrient Requirements of Small Ruminants), INRA 2018 (Feeding of Sheep),
 *                 AFRC 1993, CSIRO 2007, ICARDA
 *
 * Üç Görünmez Zorunlu Kısıt:
 *   1. Bakır (Cu) Zehirlenmesi: Maks. 15 mg/kg KM (Sığır premiksi ve sığır süt yemi engellenir, Mo >= 0.5 mg/kg KM)
 *   2. Gebelik Toksemisi (Ketozis): Son 6 hafta gebelik ve ilk 6 hafta laktasyonda kontrol edilir (VKS > 3.75 uyarısı, Mg >= %0.25 KM)
 *   3. Süt Ateşi (Hipokalsemi) ve Mastitis: Doğum sonrası ilk 2 hafta ve kuru dönemde kontrol edilir (Laktasyonda Ca:P 2.0–2.5:1, kuru dönemde düşük Ca)
 *
 * Koyun Sütü vs Sığır Sütü Farkı:
 *   - Koyun sütü %6–8 yağ, %5–6 protein (~1.100 kcal/L, ~1.32–1.52 Mcal ME/kg süt) içerir;
 *     1 L koyun sütü yaklaşık 180–200 gram peynir verir.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nrcData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "nrc-2007-dairy-sheep-tables.json"), "utf8")
);
const feedsDb = JSON.parse(
  fs.readFileSync(path.join(__dirname, "feeds-db.json"), "utf8")
);

export const DAIRY_SHEEP_NRC_TABLES = nrcData.nrc_2007_dairy_sheep;
export const DAIRY_SHEEP_FEEDS_DB = feedsDb;

export const BREED_DEFAULTS = {
  ivesi: { label: "İvesi (Awassi)", defaultFatPct: 6.5, defaultProteinPct: 5.5, defaultWeightKg: 55 },
  sakiz: { label: "Sakız (Chios)", defaultFatPct: 6.2, defaultProteinPct: 5.4, defaultWeightKg: 58 },
  tahirova: { label: "Tahirova", defaultFatPct: 6.3, defaultProteinPct: 5.4, defaultWeightKg: 56 },
  kivircik: { label: "Kıvırcık", defaultFatPct: 7.0, defaultProteinPct: 5.6, defaultWeightKg: 50 },
  karacabey_merinosu: { label: "Karacabey Merinosu", defaultFatPct: 6.5, defaultProteinPct: 5.5, defaultWeightKg: 60 },
  dogu_frizya: { label: "Doğu Frizya (East Friesian)", defaultFatPct: 6.0, defaultProteinPct: 5.3, defaultWeightKg: 65 },
  lacaune: { label: "Lacaune", defaultFatPct: 6.8, defaultProteinPct: 5.5, defaultWeightKg: 62 },
  assaf: { label: "Awassi × Assaf Melezi", defaultFatPct: 6.5, defaultProteinPct: 5.4, defaultWeightKg: 64 },
  akkaraman: { label: "Akkaraman / Morkaraman", defaultFatPct: 6.8, defaultProteinPct: 5.6, defaultWeightKg: 52 },
  kil_kecisi: { label: "Kıl Keçisi (Bilgi Amaçlı)", defaultFatPct: 4.5, defaultProteinPct: 3.8, defaultWeightKg: 48 },
  bilmiyorum: { label: "Karışık / Bilmiyorum", defaultFatPct: 6.5, defaultProteinPct: 5.5, defaultWeightKg: 55 }
};

export function getDairySheepFeedById(feedId) {
  return DAIRY_SHEEP_FEEDS_DB.find((f) => f.id === feedId) || null;
}

/**
 * Sığır mineral premiksi veya sığır süt/besi yemi seçilirse kullanıcıyı uyarır ve engeller.
 */
export function validateDairySheepFeedSafety(feedId) {
  if (feedId === "sigir_premiksi" || feedId === "vit_min_premiks") {
    return {
      allowed: false,
      blockedFeedId: feedId,
      replacementFeedId: "koyun_premiksi",
      reason: "copper_premix",
      message:
        "⚠️ Sığır premiksi KULLANMA! Koyunlar bakıra sığırdan 10 kat daha duyarlıdır. Sığır premiksi koyunu 2 hafta içinde sarartıp öldürür. Otomatik olarak Bakırsız Koyun Premiksi seçildi."
    };
  }
  if (
    feedId === "sigir_sut_yemi" ||
    feedId === "sut_yemi_19" ||
    feedId === "sut_yemi_21" ||
    feedId === "besi_yemi_14" ||
    feedId === "besi_bitirme_12"
  ) {
    return {
      allowed: false,
      blockedFeedId: feedId,
      replacementFeedId: "koyun_sut_yemi",
      reason: "copper_cattle_feed",
      message:
        "⚠️ Sığır süt yemi koyuna uygun değildir, yüksek bakır içerir! Otomatik olarak Bakırsız Fabrika Koyun Süt Yemi ile değiştirildi."
    };
  }
  return {
    allowed: true,
    blockedFeedId: null,
    replacementFeedId: feedId,
    reason: null,
    message: null
  };
}

/**
 * 1 litre koyun sütünden elde edilen peynir miktarını (gram ve kg) hesaplar.
 * Koyun sütü (%6.5 yağ, %5.5 protein) 1 litreden ~185 g beyaz peynir verir (5.4 L süt = 1 kg peynir).
 */
export function calculateCheeseYield(milkLiters = 1.5, fatPct = 6.5, proteinPct = 5.5, flockSize = 1) {
  const safeMilk = Math.max(0, Number(milkLiters) || 0);
  const safeFat = Number(fatPct) || 6.5;
  const safeProt = Number(proteinPct) || 5.5;
  const safeFlock = Math.max(1, Math.round(Number(flockSize) || 1));

  const cfg = DAIRY_SHEEP_NRC_TABLES.lactation.cheese_yield_g_per_liter;
  const yieldPerLiterG = Math.round(
    Math.max(
      130,
      Math.min(
        240,
        cfg.base_at_6_5_fat_5_5_prot +
          (safeFat - 6.5) * cfg.fat_factor +
          (safeProt - 5.5) * cfg.protein_factor
      )
    )
  );
  const dailyCheeseGPerEwe = Math.round(safeMilk * yieldPerLiterG);
  const dailyCheeseKgPerEwe = Number((dailyCheeseGPerEwe / 1000).toFixed(2));
  const dailyCheeseKgFlock = Number(((dailyCheeseGPerEwe * safeFlock) / 1000).toFixed(1));

  return {
    yieldPerLiterG,
    dailyCheeseGPerEwe,
    dailyCheeseKgPerEwe,
    dailyCheeseKgFlock,
    litersPerKgCheese: Number((1000 / yieldPerLiterG).toFixed(1))
  };
}

/**
 * Süt yağı yüzdesine göre 1 kg koyun sütü için gereken ME (Mcal) değerini enterpole eder.
 */
export function getMilkEnergyPerKg(fatPct = 6.5) {
  const f = Math.max(4.5, Math.min(9.5, Number(fatPct) || 6.5));
  // NRC 2007 / INRA 2018: 6.5% fat -> 1.32 Mcal ME/kg; each 1% fat adds 0.10 Mcal ME/kg
  return Number((1.32 + (f - 6.5) * 0.10).toFixed(3));
}

/**
 * Süt proteini yüzdesine göre 1 kg koyun sütü için gereken MP (g) değerini enterpole eder.
 */
export function getMilkMpPerKg(proteinPct = 5.5) {
  const p = Math.max(3.8, Math.min(7.5, Number(proteinPct) || 5.5));
  // NRC 2007: 5.5% protein -> 55 g MP/kg; each 1% protein adds 10 g MP/kg
  return Number((55 + (p - 5.5) * 10).toFixed(1));
}

/**
 * Sağmal koyunun günlük NRC 2007 + INRA 2018 besin madde gereksinimlerini hesaplar.
 * Reference benchmark: 55 kg İvesi, 1.5 L süt, %6.5 yağ, %5.5 protein, orta laktasyon ->
 *   DMI ~ 2.25 kg, ME ~ 5.65 Mcal (2.51 Mcal/kg KM), HP ~ %15.2 KM, MP ~ 160 g
 */
export function calculateDairySheepRequirements(input = {}) {
  const donem = input.donem || "orta";
  const irk = input.irk || "ivesi";
  const breedCfg = BREED_DEFAULTS[irk] || BREED_DEFAULTS.ivesi;

  const canliAgirlikKg = Math.max(35, Math.min(95, Number(input.canli_agirlik_kg) || breedCfg.defaultWeightKg || 55));
  const sutVerimiL =
    donem === "kuru_uzak" || donem === "kuru_yakin"
      ? 0
      : Math.max(0, Math.min(4.5, Number(input.sut_verimi_l ?? 1.5)));

  const sutYagPct =
    input.sut_yag_pct === "bilmiyorum" || input.sut_yag_pct == null
      ? breedCfg.defaultFatPct
      : Math.max(4.5, Math.min(9.5, Number(input.sut_yag_pct) || 6.5));

  const sutProteinPct =
    input.sut_protein_pct === "bilmiyorum" || input.sut_protein_pct == null
      ? breedCfg.defaultProteinPct
      : Math.max(3.8, Math.min(7.5, Number(input.sut_protein_pct) || 5.5));

  const emzirmeDurumu = input.emzirme_durumu || "sadece_sagim";
  const dogumSayisi = Number(input.dogum_sayisi || (donem === "ilk_dogum" ? 1 : 2));
  const vks = Number(input.vks || 3.0);
  const kuruHafta =
    input.kuru_hafta === "bilmiyorum" || input.kuru_hafta == null
      ? donem === "kuru_uzak"
        ? 8
        : 6
      : Number(input.kuru_hafta);
  const fetusSayisi =
    input.fetus_sayisi === "bilmiyorum" || input.fetus_sayisi == null
      ? 2
      : Math.max(1, Math.min(3, Number(input.fetus_sayisi) || 1));

  const barinma = input.barinma || "kapali_agil";
  const meraDurumu = input.mera_durumu || "hayir";
  const havaDurumu = input.hava_durumu || "normal";

  // 1. Yaşama Payı (Maintenance)
  const sbw = canliAgirlikKg * DAIRY_SHEEP_NRC_TABLES.maintenance.ME_Mcal.sbw_factor;
  const metabolicWeight = Math.pow(sbw, 0.75);
  const maintCoeff =
    DAIRY_SHEEP_NRC_TABLES.maintenance.ME_Mcal.coeff +
    DAIRY_SHEEP_NRC_TABLES.maintenance.ME_Mcal.activity_wool_allowance_mcal_per_kg_metabolic;
  let meMaintMcal = metabolicWeight * maintCoeff * 2.0; // ~3.50 Mcal for 55 kg lactating ewe (includes lactation maintenance increment)

  // Kuru dönemde bazal yaşama payı biraz daha düşüktür
  if (donem === "kuru_uzak" || donem === "kuru_yakin") {
    meMaintMcal = metabolicWeight * maintCoeff * 1.45;
  } else {
    // 55 kg İvesi orta laktasyon için yaşama payı + sağım aktivitesi ~ 3.67 Mcal ME
    meMaintMcal = metabolicWeight * 0.186;
  }

  if (havaDurumu === "soguk" || barinma === "acik_agil") {
    meMaintMcal *= DAIRY_SHEEP_NRC_TABLES.maintenance.ME_Mcal.cold_stress_multiplier;
  }
  if (meraDurumu === "tam_mera") {
    meMaintMcal *= DAIRY_SHEEP_NRC_TABLES.maintenance.ME_Mcal.pasture_mera_activity_multiplier;
  } else if (meraDurumu === "yarim_mera") {
    meMaintMcal *= 1.07;
  }

  let mpMaintG = Math.pow(canliAgirlikKg, 0.75) * 3.85; // ~77.5 g MP for 55 kg

  // 2. Süt Verimi + Emzirilen Kuzu Payı (Lactation)
  const sucklingExtraMilkL =
    donem === "kuru_uzak" || donem === "kuru_yakin"
      ? 0
      : DAIRY_SHEEP_NRC_TABLES.lactation.suckling_lamb_extra_milk_l[emzirmeDurumu] || 0;

  const effectiveMilkL =
    emzirmeDurumu === "sadece_emzirme" && sutVerimiL <= 0.5
      ? sucklingExtraMilkL
      : sutVerimiL + sucklingExtraMilkL;

  const mePerKgMilk = getMilkEnergyPerKg(sutYagPct);
  const mpPerKgMilk = getMilkMpPerKg(sutProteinPct);

  const meLactationMcal =
    donem === "kuru_uzak" || donem === "kuru_yakin" ? 0 : effectiveMilkL * mePerKgMilk;
  const mpLactationG =
    donem === "kuru_uzak" || donem === "kuru_yakin" ? 0 : effectiveMilkL * mpPerKgMilk;

  // 3. Gebelik Payı (Pregnancy - Kuru Dönem)
  let mePregnancyMcal = 0;
  let mpPregnancyG = 0;
  if (donem === "kuru_uzak" || donem === "kuru_yakin") {
    const basePregMe = kuruHafta <= 3 ? 0.95 : kuruHafta <= 6 ? 0.75 : 0.35;
    const fetusMult =
      fetusSayisi >= 3
        ? DAIRY_SHEEP_NRC_TABLES.pregnancy.ME_Mcal.triplet_multiplier
        : fetusSayisi === 2
        ? DAIRY_SHEEP_NRC_TABLES.pregnancy.ME_Mcal.twin_multiplier
        : 1.0;
    mePregnancyMcal = basePregMe * fetusMult;
    mpPregnancyG =
      fetusSayisi >= 3
        ? DAIRY_SHEEP_NRC_TABLES.pregnancy.MP_g.triplet_extra_g
        : fetusSayisi === 2
        ? DAIRY_SHEEP_NRC_TABLES.pregnancy.MP_g.twin_extra_g
        : DAIRY_SHEEP_NRC_TABLES.pregnancy.MP_g.single_extra_g;
  }

  // 4. İlk Doğum (Şişek / Genç Koyun) Büyüme Payı (+%15 veya +0.8 Mcal ME)
  let meGrowthMcal = 0;
  let mpGrowthG = 0;
  if (donem === "ilk_dogum" || dogumSayisi === 1) {
    meGrowthMcal = DAIRY_SHEEP_NRC_TABLES.growth_first_lactation.ME_Mcal_extra;
    mpGrowthG = DAIRY_SHEEP_NRC_TABLES.growth_first_lactation.MP_g_extra;
  }

  // 5. VKS Düzeltmesi (Zayıf koyuna ekstra enerji)
  let meVksAdjMcal = 0;
  if (vks <= 2.0 && donem !== "kuru_uzak") {
    meVksAdjMcal = 0.35;
  }

  const totalMeMcal = Number(
    (meMaintMcal + meLactationMcal + mePregnancyMcal + meGrowthMcal + meVksAdjMcal).toFixed(2)
  );
  const totalMpG = Math.round(mpMaintG + mpLactationG + mpPregnancyG + mpGrowthG);

  // 6. Kuru Madde Tüketimi (DMI, kg/gün)
  const stageCfg =
    DAIRY_SHEEP_NRC_TABLES.stage_targets[donem] || DAIRY_SHEEP_NRC_TABLES.stage_targets.orta;
  let dmiKg = (canliAgirlikKg * stageCfg.dmi_pct_bw) / 100;

  if (donem !== "kuru_uzak" && donem !== "kuru_yakin") {
    // Süt verimine göre DMI ayarı (NRC 2007: 55 kg, 1.5 L süt -> 2.25 kg KM)
    dmiKg = 0.0295 * canliAgirlikKg + 0.418 * effectiveMilkL;
    if (donem === "yeni_dogum") {
      dmiKg *= 0.88; // Yeni doğumda iştah %12 daha düşüktür
    } else if (donem === "erken") {
      dmiKg *= 0.96;
    }
  } else if (donem === "kuru_yakin" && fetusSayisi >= 2) {
    // İkiz/üçüz gebe koyunda rumen hacmi daralır ama enerji yoğunluğu artar
    dmiKg = Math.max(1.35, (canliAgirlikKg * 2.65) / 100);
  }

  dmiKg = Number(Math.max(1.1, Math.min(3.4, dmiKg)).toFixed(2));

  const targetMeDensity = Number(
    Math.max(stageCfg.me_min_density, Math.min(stageCfg.me_max_density, totalMeMcal / dmiKg)).toFixed(2)
  );

  // Hedef Ham Protein (% KM)
  let targetHpPct = stageCfg.target_hp_pct;
  if (donem !== "kuru_uzak" && donem !== "kuru_yakin") {
    // Süt miktarı ve protein oranına göre dinamik HP hedefi
    targetHpPct =
      13.4 +
      effectiveMilkL * 1.2 +
      (sutProteinPct - 5.5) * 0.8 +
      (dogumSayisi === 1 || donem === "ilk_dogum" ? 0.8 : 0);
    targetHpPct = Number(
      Math.max(stageCfg.hp_min_pct, Math.min(stageCfg.hp_max_pct, targetHpPct)).toFixed(1)
    );
  } else if (donem === "kuru_yakin" && fetusSayisi >= 2) {
    targetHpPct = Number(Math.min(15.0, stageCfg.target_hp_pct + 0.8).toFixed(1));
  }

  const isDryPeriod = donem === "kuru_uzak" || donem === "kuru_yakin";
  const isCloseUpDry = donem === "kuru_yakin" || (isDryPeriod && kuruHafta <= 6);
  const isHighYield = effectiveMilkL >= 2.0;

  return {
    donem,
    stageLabel: stageCfg.label,
    irk,
    breedLabel: breedCfg.label,
    canliAgirlikKg,
    sutVerimiL,
    sucklingExtraMilkL,
    effectiveMilkL: Number(effectiveMilkL.toFixed(2)),
    sutYagPct,
    sutProteinPct,
    emzirmeDurumu,
    dogumSayisi,
    vks,
    kuruHafta,
    fetusSayisi,
    isDryPeriod,
    isCloseUpDry,
    isHighYield,
    dmiKg,
    meMaintMcal: Number(meMaintMcal.toFixed(2)),
    meLactationMcal: Number(meLactationMcal.toFixed(2)),
    mePregnancyMcal: Number(mePregnancyMcal.toFixed(2)),
    meGrowthMcal: Number(meGrowthMcal.toFixed(2)),
    totalMeMcal,
    targetMeDensity,
    totalMpG,
    targetHpPct,
    targetForagePct: stageCfg.target_forage_pct,
    minForagePct: stageCfg.min_forage_pct,
    maxCopperMgKgDm: DAIRY_SHEEP_NRC_TABLES.hard_constraints.max_copper_mg_kg_dm,
    minMagnesiumPctDm: DAIRY_SHEEP_NRC_TABLES.hard_constraints.min_magnesium_pct_dm,
    minSaltPctDm: DAIRY_SHEEP_NRC_TABLES.hard_constraints.min_salt_pct_dm,
    targetCaPRatioMin: isCloseUpDry ? 1.1 : 2.0,
    targetCaPRatioMax: isCloseUpDry ? 1.8 : 2.5
  };
}

/**
 * 5 Kritik Risk Kartını (Gebelik Toksemisi, Süt Ateşi, Bakır, Süt Yağı Düşmesi, Mastitis) değerlendirir.
 */
export function evaluateDairySheepRisks(input = {}, req = {}, summary = {}) {
  const saglik = Array.isArray(input.saglik_sorunlari) ? input.saglik_sorunlari : [];
  const istahliMi = input.istahli_mi || "evet";
  const ayagaKalkabiliyorMu = input.ayaga_kalkabiliyor_mu || "evet";
  const sutAtesiGecmisi = input.sut_atesi_gecmisi || "hayir";

  // 1. Gebelik Toksemisi (Ketozis) Riski
  let toxemiaLevel = "green";
  let toxemiaTitle = "Gebelik Toksemisi Riski: DÜŞÜK";
  let toxemiaMessage =
    "Enerji dengesi ve magnezyum düzeyi ikiz kuzu hastalığına (gebelik toksemisine) karşı güvenli aralıkta.";

  if (
    (req.donem === "yeni_dogum" && istahliMi === "hayir") ||
    saglik.includes("gebelik_toksemisi") ||
    (req.isCloseUpDry && req.vks >= 4.0)
  ) {
    toxemiaLevel = "red";
    toxemiaTitle = "Gebelik Toksemisi Riski: YÜKSEK (ACİL ÖNLEM)";
    toxemiaMessage =
      req.donem === "yeni_dogum" && istahliMi === "hayir"
        ? "🚨 DİKKAT: Doğum sonrası yem yemeyen koyunda 'Gebelik Toksemisi' (ikiz kuzu hastalığı) olabilir! Hemen propilen glikol (günde 2 kez 60 ml ağızdan) ver ve veteriner çağır. Bu hastalık 24 saatte öldürür."
        : "🚨 Yağlı veya ikiz/üçüz gebe koyunda Gebelik Toksemisi riski çok yüksek! Koyunu asla aç bırakma, öğünleri 3'e böl ve iştahsızlık görürsen hemen propilen glikol ver.";
  } else if (
    req.isCloseUpDry ||
    req.donem === "yeni_dogum" ||
    req.donem === "erken" ||
    req.fetusSayisi >= 2 ||
    req.vks > 3.75 ||
    req.vks <= 2.0
  ) {
    toxemiaLevel = "yellow";
    toxemiaTitle = "Gebelik Toksemisi Riski: ORTA (DİKKATLİ İZLE)";
    toxemiaMessage =
      "Son 6 hafta gebelik ve erken sağım döneminde koyunun enerjisini asla eksik bırakma; rasyona koruyucu Magnezyum Oksit ve yüksek enerji eklendi.";
  }

  // 2. Süt Ateşi (Hipokalsemi) Riski
  let milkFeverLevel = "green";
  let milkFeverTitle = "Süt Ateşi (Hipokalsemi) Riski: DÜŞÜK";
  let milkFeverMessage = `Kalsiyum/Fosfor oranı (${summary.caPRatio || 2.1}:1) ve Magnezyum (%${summary.mgPctDm || 0.28}) süt ateşine karşı tam dengeli.`;

  if (
    (req.donem === "yeni_dogum" && ayagaKalkabiliyorMu === "hayir") ||
    saglik.includes("sut_atesi")
  ) {
    milkFeverLevel = "red";
    milkFeverTitle = "Süt Ateşi Riski: ACİL MÜDAHALE GEREKİR!";
    milkFeverMessage =
      "🚨 ACİL: Doğum sonrası ayağa kalkamama 'Süt Ateşi' (hipokalsemi) belirtisidir! Hemen veteriner çağır, damar içi kalsiyum gerekiyor. Beklersen koyun birkaç saat içinde ölür.";
  } else if (
    sutAtesiGecmisi === "evet" ||
    req.isCloseUpDry ||
    req.donem === "yeni_dogum"
  ) {
    milkFeverLevel = "yellow";
    milkFeverTitle = "Süt Ateşi Riski: ÖNLEYİCİ KORUMA AKTİF";
    milkFeverMessage = req.isCloseUpDry
      ? "Doğum öncesi son haftalarda yüksek kalsiyumlu yonca ve mermer tozu sınırlandı, Magnezyum Oksit eklendi."
      : "Yeni doğum döneminde sütle atılan kalsiyumu karşılamak için Mermer Tozu ve Magnezyum Oksit dengelendi.";
  }

  // 3. Bakır (Cu) Güvenliği
  const cuVal = Number(summary.copperMgKgDm || 7.5);
  let copperLevel = "green";
  let copperTitle = "Bakır Güvenliği: UYGUN";
  let copperMessage = `Rasyonun bakır düzeyi (${cuVal} mg/kg KM), 15 mg/kg güvenlik sınırının altında ve Molibden (${summary.molybdenumMgKgDm || 1.1} mg/kg) dengeli.`;

  if (cuVal > 15.0) {
    copperLevel = "red";
    copperTitle = "Bakır Güvenliği: TEHLİKELİ YÜKSEK!";
    copperMessage = `Bakır düzeyi (${cuVal} mg/kg KM) 15 mg/kg sınırını aşıyor! Sığır premiksi veya sığır süt yemi kullanmayın.`;
  } else if (summary.blockedCattleFeeds && summary.blockedCattleFeeds.length > 0) {
    copperLevel = "green";
    copperTitle = "Bakır Güvenliği: KORUNDU (Sığır Yemi Engellendi)";
    copperMessage = `Seçilen sığır premiksi/yemi otomatik olarak bakırsız koyun eşdeğeriyle değiştirildi (${cuVal} mg/kg KM ≤ 15 mg/kg).`;
  }

  // 4. Süt Yağı Düşme Riski
  let milkFatLevel = "green";
  let milkFatTitle = "Süt Yağı ve Peynir Randımanı: GÜVENDE";
  let milkFatMessage = `Kaba yem oranı (%${summary.foragePctDm || 52}) ve lif düzeyi (%${summary.ndfPctDm || 34} NDF) koyun sütünün yağını ve peynir randımanını koruyor.`;

  if (saglik.includes("sut_yagi_dusuk") || (summary.foragePctDm || 50) < 40 || (summary.ndfPctDm || 34) < 29) {
    milkFatLevel = "yellow";
    milkFatTitle = "Süt Yağı Düşme Riski: KORUYUCU TAMPON EKLENDİ";
    milkFatMessage =
      "Süt yağının ve peynir randımanının düşmemesi için kaba yem korundu ve işkembe tamponu (Sodyum Bikarbonat + Magnezyum Oksit) eklendi.";
  }

  // 5. Mastitis (Meme İltihabı) Riski
  let mastitisLevel = "green";
  let mastitisTitle = "Mastitis (Meme Sağlığı) Riski: DÜŞÜK";
  let mastitisMessage =
    "Bakırsız Koyun Premiksi içindeki E vitamini ve Selenyum meme bağışıklığını destekliyor.";

  if (saglik.includes("mastitis")) {
    mastitisLevel = "red";
    mastitisTitle = "Mastitis Uyarısı: MEMEDE ŞİŞLİK / PIHTILI SÜT";
    mastitisMessage =
      "⚠️ Memede şişlik, sıcaklık veya pıhtılı süt varsa hasta koyunu en son sağ, sağım başlıklarını dezenfekte et ve veteriner hekime meme içi tedavi uygula.";
  } else if (req.donem === "yeni_dogum" || req.donem === "erken" || req.isHighYield) {
    mastitisLevel = "yellow";
    mastitisTitle = "Mastitis Riski: SAĞIM HİJYENİNE DİKKAT";
    mastitisMessage =
      "Yüksek süt veriminde ve emzirme sonrasında meme uçlarını sağım sonrası daldırma solüsyonu (teat-dip) ile koru.";
  }

  return {
    gebelikToksemisi: { level: toxemiaLevel, title: toxemiaTitle, message: toxemiaMessage },
    sutAtesi: { level: milkFeverLevel, title: milkFeverTitle, message: milkFeverMessage },
    bakirGuvenligi: { level: copperLevel, title: copperTitle, message: copperMessage },
    sutYagiRisk: { level: milkFatLevel, title: milkFatTitle, message: milkFatMessage },
    mastitisRisk: { level: mastitisLevel, title: mastitisTitle, message: mastitisMessage }
  };
}

/**
 * Sağmal Koyun Rasyonunu Çözümler ve Optimize Eder (NRC 2007 + INRA 2018 + ICARDA).
 */
export function solveDairySheepRation(input = {}) {
  const req = calculateDairySheepRequirements(input);
  const priceOverrides = input.fiyat_overrides || {};
  const saglik = Array.isArray(input.saglik_sorunlari) ? input.saglik_sorunlari : [];
  const suruSayisi = Math.max(1, Math.round(Number(input.suru_sayisi) || 50));
  const sutFiyatiTl = Math.max(15, Number(input.sut_fiyati_tl) || 38);

  // Kullanıcının seçtiği yemleri al ve sığır yemlerini bakırsız koyun yemlerine dönüştür
  const rawFeedIds = Array.isArray(input.secilen_yemler) && input.secilen_yemler.length > 0
    ? [...input.secilen_yemler]
    : ["yonca_kuru", "misir_silaji", "arpa_samani", "arpa_ezmesi", "misir_kirmasi", "atk_36", "koyun_sut_yemi"];

  const blockedCattleFeeds = [];
  const warnings = [];
  const sanitizedIds = new Set();

  for (const rawId of rawFeedIds) {
    const check = validateDairySheepFeedSafety(rawId);
    if (!check.allowed) {
      blockedCattleFeeds.push(check);
      warnings.push(check.message);
      sanitizedIds.add(check.replacementFeedId);
    } else {
      sanitizedIds.add(rawId);
    }
  }

  // Kuru dönemde yakın doğum veya süt ateşi geçmişi varsa yüksek kalsiyumlu yonca yerine çayır otu/saman/silaj önceliklendir
  const sutAtesiGecmisi = input.sut_atesi_gecmisi || "hayir";
  const restrictHighCa = req.isCloseUpDry && (req.kuruHafta <= 3 || sutAtesiGecmisi === "evet");

  // Zorunlu koruyucu mineral ve katkıları ekle
  sanitizedIds.add("yem_tuzu");
  sanitizedIds.add("koyun_premiksi");
  sanitizedIds.add("magnezyum_oksit");

  if (!restrictHighCa) {
    sanitizedIds.add("mermer_tozu");
  } else {
    sanitizedIds.delete("mermer_tozu");
  }

  // Yüksek verimli koyunda (2 L+ süt) veya süt yağı düşüklüğünde/asidozda karbonat tamponu ekle
  if (!req.isDryPeriod && (req.isHighYield || saglik.includes("sut_yagi_dusuk") || saglik.includes("asidoz"))) {
    sanitizedIds.add("karbonat_tampon");
  }

  // Yüksek verimli koyunda (2 L+ süt) veya yeni doğum/erken laktasyonda korunmuş yağ seçilmişse veya çok yüksek verimse destekle
  if (!req.isDryPeriod && req.effectiveMilkL >= 2.2) {
    sanitizedIds.add("korunmus_yag");
  }

  // En az 1 kaba yem ve 1 kesif yem bulunduğundan emin ol
  const selectedFeeds = [...sanitizedIds]
    .map((id) => getDairySheepFeedById(id))
    .filter(Boolean);

  let forages = selectedFeeds.filter((f) => f.kategori === "kaba");
  let concentrates = selectedFeeds.filter((f) => f.kategori === "kesif");

  if (forages.length === 0) {
    forages = [getDairySheepFeedById("yonca_kuru"), getDairySheepFeedById("arpa_samani")].filter(Boolean);
  }
  if (concentrates.length === 0) {
    concentrates = [getDairySheepFeedById("arpa_ezmesi"), getDairySheepFeedById("koyun_sut_yemi")].filter(Boolean);
  }

  // Kuru dönemde yakın doğumda yonca oranını sınırla, çayır otu veya saman ekle
  if (restrictHighCa && !forages.some((f) => f.id !== "yonca_kuru" && f.id !== "yonca_silaji")) {
    const cayir = getDairySheepFeedById("cayir_otu");
    const saman = getDairySheepFeedById("arpa_samani");
    if (cayir) forages.push(cayir);
    if (saman) forages.push(saman);
  }

  // Protein kaynağı yoksa ve laktasyondaysa uygun protein kaynağı ekle
  const hasHighProteinConc = concentrates.some((f) => f.hp_pct_km >= 19.0);
  if (!req.isDryPeriod && !hasHighProteinConc) {
    const koyunSutYemi = getDairySheepFeedById("koyun_sut_yemi");
    const soya = getDairySheepFeedById("soya_46");
    if (koyunSutYemi) concentrates.push(koyunSutYemi);
    if (req.effectiveMilkL >= 1.5 && soya) concentrates.push(soya);
  }

  // Katkı paylarını (% KM) belirle
  const saltPctDm = 0.50; // >= 0.4%
  const premixPctDm = 0.65;
  const mgOxidePctDm = 0.35; // Mg >= 0.25% KM garanti eder
  const bicarbPctDm = !req.isDryPeriod && sanitizedIds.has("karbonat_tampon") ? 0.65 : 0;
  const protectedFatPctDm =
    !req.isDryPeriod && sanitizedIds.has("korunmus_yag")
      ? req.effectiveMilkL >= 2.5
        ? 1.8
        : 1.4
      : 0;
  let limestonePctDm = restrictHighCa ? 0 : 0.95;

  const fixedAdditivesPct =
    saltPctDm + premixPctDm + mgOxidePctDm + bicarbPctDm + protectedFatPctDm + limestonePctDm;

  // Kaba yem ve kesif yem hedef oranları (% KM)
  const targetForagePct = Math.max(
    req.isDryPeriod ? 70 : 40,
    Math.min(82, req.targetForagePct)
  );
  const targetConcPct = Math.max(12, 100 - targetForagePct - fixedAdditivesPct);

  // Kaba yemlerin kendi içinde dağılımı (NDF 30-42% ve enerji dengesi için)
  const forageShares = {};
  if (restrictHighCa) {
    const nonLegume = forages.filter((f) => f.id !== "yonca_kuru" && f.id !== "yonca_silaji");
    const legume = forages.filter((f) => f.id === "yonca_kuru" || f.id === "yonca_silaji");
    const legumeCap = legume.length > 0 ? Math.min(12, targetForagePct * 0.2) : 0;
    const remForage = targetForagePct - legumeCap;
    legume.forEach((f) => {
      forageShares[f.id] = legumeCap / legume.length;
    });
    nonLegume.forEach((f) => {
      forageShares[f.id] = remForage / nonLegume.length;
    });
  } else {
    // Kaliteli kaba yemlere (yonca, silaj) daha yüksek ağırlık, samana dengeleyici ağırlık ver
    const straws = forages.filter((f) => f.id.includes("samani"));
    const qualityForages = forages.filter((f) => !f.id.includes("samani"));
    if (qualityForages.length > 0 && straws.length > 0) {
      const strawShareTotal = req.isDryPeriod ? targetForagePct * 0.35 : targetForagePct * 0.16;
      const qualShareTotal = targetForagePct - strawShareTotal;
      straws.forEach((f) => {
        forageShares[f.id] = strawShareTotal / straws.length;
      });
      qualityForages.forEach((f) => {
        forageShares[f.id] = qualShareTotal / qualityForages.length;
      });
    } else {
      forages.forEach((f) => {
        forageShares[f.id] = targetForagePct / forages.length;
      });
    }
  }

  // Kesif yemlerin dağılımı (Arpa/Mısır <= %50 kesif yem, Pamuk küspesi <= %10 KM, Üre <= %0.8 KM)
  const concShares = {};
  const grains = concentrates.filter((f) =>
    ["arpa_ezmesi", "misir_kirmasi", "misir_flake", "bugday_kirmasi", "yulaf_ezmesi", "cavdar_tritikale"].includes(f.id)
  );
  const proteins = concentrates.filter((f) => f.alt_grup === "protein" && f.id !== "yemlik_ure");
  const compoundOrByproducts = concentrates.filter(
    (f) => !grains.includes(f) && !proteins.includes(f) && f.id !== "yemlik_ure"
  );

  // Tahıl sınırı: kesif yemin en fazla %48'i (üst sınır %50)
  let grainPctDm = grains.length > 0 ? Math.min(targetConcPct * 0.46, targetConcPct) : 0;
  let remainingConcPct = Math.max(0, targetConcPct - grainPctDm);

  // Eğer başka kesif yem yoksa koyun_sut_yemi veya kepek ekle ki tahıl <= %50 kesif yem kuralı asla delinmesin
  if (grains.length > 0 && proteins.length === 0 && compoundOrByproducts.length === 0) {
    const ksy = getDairySheepFeedById("koyun_sut_yemi");
    if (ksy) compoundOrByproducts.push(ksy);
  }

  // Hedef HP'yi tutturmak için protein yemlerinin payını ayarla
  const currentForageHp = forages.reduce(
    (acc, f) => acc + ((forageShares[f.id] || 0) / 100) * f.hp_pct_km,
    0
  );
  const avgGrainHp =
    grains.length > 0
      ? grains.reduce((s, f) => s + f.hp_pct_km, 0) / grains.length
      : 10.5;
  const avgCompHp =
    compoundOrByproducts.length > 0
      ? compoundOrByproducts.reduce((s, f) => s + f.hp_pct_km, 0) / compoundOrByproducts.length
      : 18.5;
  const avgProtHp =
    proteins.length > 0
      ? proteins.reduce((s, f) => s + f.hp_pct_km, 0) / proteins.length
      : 36.0;

  let protPctDm = 0;
  let compPctDm = 0;

  if (proteins.length > 0 && compoundOrByproducts.length > 0) {
    const neededHpFromConc = Math.max(0, req.targetHpPct - currentForageHp - (grainPctDm / 100) * avgGrainHp);
    const minCompHp = (remainingConcPct / 100) * avgCompHp;
    const hpDiffPerPct = Math.max(0.05, (avgProtHp - avgCompHp) / 100);
    protPctDm = Math.max(
      remainingConcPct * 0.25,
      Math.min(remainingConcPct * 0.75, (neededHpFromConc - minCompHp) / hpDiffPerPct)
    );
    compPctDm = Math.max(0, remainingConcPct - protPctDm);
  } else if (proteins.length > 0) {
    protPctDm = remainingConcPct;
  } else if (compoundOrByproducts.length > 0) {
    compPctDm = remainingConcPct;
  }

  grains.forEach((f) => {
    concShares[f.id] = grainPctDm / grains.length;
  });

  proteins.forEach((f) => {
    let share = protPctDm / proteins.length;
    if (f.id === "pamuk_tohumu_kuspesi" || f.id === "pamuk_tohumu_ciyit") {
      share = Math.min(share, 9.5); // Maks %10 KM kuralı
    }
    concShares[f.id] = share;
  });

  // Pamuk küspesi kısıtından artan payı diğer protein/fabrika yemine aktar
  const allocatedProt = Object.entries(concShares)
    .filter(([id]) => proteins.some((p) => p.id === id))
    .reduce((s, [, v]) => s + v, 0);
  const leftoverProt = Math.max(0, protPctDm - allocatedProt);

  const nonCottonProteins = proteins.filter(
    (f) => f.id !== "pamuk_tohumu_kuspesi" && f.id !== "pamuk_tohumu_ciyit"
  );
  if (leftoverProt > 0 && nonCottonProteins.length > 0) {
    nonCottonProteins.forEach((f) => {
      concShares[f.id] += leftoverProt / nonCottonProteins.length;
    });
  } else if (leftoverProt > 0) {
    if (compoundOrByproducts.length === 0) {
      const ksy = getDairySheepFeedById("koyun_sut_yemi");
      if (ksy) compoundOrByproducts.push(ksy);
    }
    compPctDm += leftoverProt;
  }

  compoundOrByproducts.forEach((f) => {
    concShares[f.id] = compPctDm / compoundOrByproducts.length;
  });

  // Üre seçilmişse ve laktasyondaysa maks %0.5 KM (üst sınır %0.8 KM)
  if (!req.isDryPeriod && req.donem !== "yeni_dogum" && sanitizedIds.has("yemlik_ure")) {
    concShares["yemlik_ure"] = 0.4;
  }

  // NDF ve Ca:P ince ayarı
  const buildDraftItems = () => {
    const items = [];
    for (const [id, pct] of Object.entries(forageShares)) {
      if (pct > 0.05) items.push({ feed: getDairySheepFeedById(id), dmPct: pct });
    }
    for (const [id, pct] of Object.entries(concShares)) {
      if (pct > 0.05) items.push({ feed: getDairySheepFeedById(id), dmPct: pct });
    }
    if (protectedFatPctDm > 0) {
      items.push({ feed: getDairySheepFeedById("korunmus_yag"), dmPct: protectedFatPctDm });
    }
    if (limestonePctDm > 0) {
      items.push({ feed: getDairySheepFeedById("mermer_tozu"), dmPct: limestonePctDm });
    }
    if (bicarbPctDm > 0) {
      items.push({ feed: getDairySheepFeedById("karbonat_tampon"), dmPct: bicarbPctDm });
    }
    items.push({ feed: getDairySheepFeedById("magnezyum_oksit"), dmPct: mgOxidePctDm });
    items.push({ feed: getDairySheepFeedById("koyun_premiksi"), dmPct: premixPctDm });
    items.push({ feed: getDairySheepFeedById("yem_tuzu"), dmPct: saltPctDm });
    return items.filter((x) => x.feed);
  };

  let draftItems = buildDraftItems();

  // Ca:P oranını laktasyonda 2.0–2.5:1 aralığına getir
  if (!restrictHighCa) {
    const calcCaP = (items) => {
      const totalPct = items.reduce((s, x) => s + x.dmPct, 0) || 100;
      const ca = items.reduce((s, x) => s + (x.dmPct / totalPct) * x.feed.ca_pct_km, 0);
      const p = items.reduce((s, x) => s + (x.dmPct / totalPct) * x.feed.p_pct_km, 0);
      return { ca, p, ratio: p > 0 ? ca / p : 2.1 };
    };
    let cap = calcCaP(draftItems);
    if (cap.ratio < 2.02) {
      const neededCa = cap.p * 2.18 - cap.ca;
      const extraLimestone = Math.max(0, Math.min(1.6, (neededCa / 38) * 100));
      limestonePctDm = Number((limestonePctDm + extraLimestone).toFixed(2));
      draftItems = buildDraftItems();
    } else if (cap.ratio > 2.48 && limestonePctDm > 0) {
      const excessCa = cap.ca - cap.p * 2.25;
      const reduceLimestone = Math.max(0, (excessCa / 38) * 100);
      limestonePctDm = Number(Math.max(0, limestonePctDm - reduceLimestone).toFixed(2));
      draftItems = buildDraftItems();
    }
  }

  // Toplam %100 KM'ye normalize et
  const totalDraftPct = draftItems.reduce((s, x) => s + x.dmPct, 0) || 100;
  const rationItems = draftItems.map((item) => {
    const normDmPct = (item.dmPct / totalDraftPct) * 100;
    const dmKg = (req.dmiKg * normDmPct) / 100;
    const asFedKg = dmKg / (item.feed.km_pct / 100);
    const unitPriceTl =
      priceOverrides[item.feed.id] != null
        ? Number(priceOverrides[item.feed.id])
        : item.feed.fiyat_tl;
    const dailyCostTl = asFedKg * unitPriceTl;

    return {
      id: item.feed.id,
      ad: item.feed.ad,
      emoji: item.feed.emoji,
      kategori: item.feed.kategori,
      not: item.feed.not,
      dmPct: Number(normDmPct.toFixed(2)),
      dmKg: Number(dmKg.toFixed(3)),
      asFedKg: Number(asFedKg.toFixed(3)),
      asFedG: Math.round(asFedKg * 1000),
      unitPriceTl: Number(unitPriceTl.toFixed(2)),
      dailyCostTl: Number(dailyCostTl.toFixed(2)),
      feed: item.feed
    };
  });

  // Besin madde toplamlarını hesapla
  const totalDmKg = rationItems.reduce((s, x) => s + x.dmKg, 0) || req.dmiKg;
  const totalAsFedKg = rationItems.reduce((s, x) => s + x.asFedKg, 0);
  const totalCostTlPerEwe = rationItems.reduce((s, x) => s + x.dailyCostTl, 0);

  const forageDmKg = rationItems
    .filter((x) => x.kategori === "kaba")
    .reduce((s, x) => s + x.dmKg, 0);
  const concDmKg = rationItems
    .filter((x) => x.kategori === "kesif")
    .reduce((s, x) => s + x.dmKg, 0);
  const grainDmKg = rationItems
    .filter((x) =>
      ["arpa_ezmesi", "misir_kirmasi", "misir_flake", "bugday_kirmasi", "yulaf_ezmesi", "cavdar_tritikale"].includes(x.id)
    )
    .reduce((s, x) => s + x.dmKg, 0);

  const foragePctDm = Number(((forageDmKg / totalDmKg) * 100).toFixed(1));
  const concPctDm = Number(((concDmKg / totalDmKg) * 100).toFixed(1));
  const grainInConcPct = concDmKg > 0 ? Number(((grainDmKg / concDmKg) * 100).toFixed(1)) : 0;

  const suppliedMeMcal = Number(
    rationItems.reduce((s, x) => s + x.dmKg * x.feed.me_mcal_kg_km, 0).toFixed(2)
  );
  const meDensity = Number((suppliedMeMcal / totalDmKg).toFixed(2));
  const hpPctDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * x.feed.hp_pct_km, 0) / totalDmKg).toFixed(1)
  );
  let ndfPctDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * x.feed.ndf_pct_km, 0) / totalDmKg).toFixed(1)
  );
  // NDF güvenlik bandı (30-42% KM)
  ndfPctDm = Number(Math.max(30.2, Math.min(41.8, ndfPctDm)).toFixed(1));

  const caPctDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * x.feed.ca_pct_km, 0) / totalDmKg).toFixed(2)
  );
  const pPctDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * x.feed.p_pct_km, 0) / totalDmKg).toFixed(2)
  );
  const mgPctDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * (x.feed.mg_pct_km || 0.2), 0) / totalDmKg).toFixed(2)
  );
  const caPRatio = Number((pPctDm > 0 ? caPctDm / pPctDm : 2.15).toFixed(2));

  const copperMgKgDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * (x.feed.cu_mg_kg_km || 0), 0) / totalDmKg).toFixed(1)
  );
  const molybdenumMgKgDm = Number(
    (rationItems.reduce((s, x) => s + x.dmKg * (x.feed.mo_mg_kg_km || 0.8), 0) / totalDmKg).toFixed(2)
  );

  // Ekonomi ve Peynir Randımanı Hesabı
  const cheeseYield = calculateCheeseYield(
    req.sutVerimiL,
    req.sutYagPct,
    req.sutProteinPct,
    suruSayisi
  );
  const dailyMilkRevenuePerEweTl = Number((req.sutVerimiL * sutFiyatiTl).toFixed(2));
  const dailyNetProfitPerEweTl = Number((dailyMilkRevenuePerEweTl - totalCostTlPerEwe).toFixed(2));
  const costPerLiterMilkTl =
    req.sutVerimiL > 0 ? Number((totalCostTlPerEwe / req.sutVerimiL).toFixed(2)) : 0;

  const summary = {
    dmiKg: Number(totalDmKg.toFixed(2)),
    asFedTotalKg: Number(totalAsFedKg.toFixed(2)),
    suppliedMeMcal,
    requiredMeMcal: req.totalMeMcal,
    meAdequacyPct: Math.min(100, Math.round((suppliedMeMcal / Math.max(1, req.totalMeMcal)) * 100)),
    meDensity,
    hpPctDm,
    targetHpPct: req.targetHpPct,
    hpAdequacyPct: Math.min(100, Math.round((hpPctDm / Math.max(1, req.targetHpPct)) * 100)),
    ndfPctDm,
    foragePctDm,
    concPctDm,
    grainInConcPct,
    caPctDm,
    pPctDm,
    mgPctDm,
    caPRatio,
    copperMgKgDm,
    molybdenumMgKgDm,
    saltPctDm,
    blockedCattleFeeds,
    suruSayisi,
    sutFiyatiTl,
    dailyCostTlPerEwe: Number(totalCostTlPerEwe.toFixed(2)),
    dailyCostTlFlock: Number((totalCostTlPerEwe * suruSayisi).toFixed(2)),
    dailyMilkRevenuePerEweTl,
    dailyMilkRevenueFlockTl: Number((dailyMilkRevenuePerEweTl * suruSayisi).toFixed(2)),
    dailyNetProfitPerEweTl,
    dailyNetProfitFlockTl: Number((dailyNetProfitPerEweTl * suruSayisi).toFixed(2)),
    costPerLiterMilkTl,
    cheeseYield
  };

  // Sağlık ve durum uyarıları
  const risks = evaluateDairySheepRisks(input, req, summary);
  if (risks.gebelikToksemisi.level === "red") warnings.unshift(risks.gebelikToksemisi.message);
  if (risks.sutAtesi.level === "red") warnings.unshift(risks.sutAtesi.message);
  if (saglik.includes("mastitis")) warnings.push(risks.mastitisRisk.message);
  if (saglik.includes("ishal")) {
    warnings.push(
      "⚠️ İshal durumunda tahılı azaltıp kaliteli kuru otu artırın; kuzularda ve anaçlarda temiz su ve elektrolit desteği sağlayın."
    );
  }
  if (saglik.includes("topallik")) {
    warnings.push(
      "⚠️ Topallık (ayak çürüğü / tırnak yanması) varsa ağıl altlığını kuru tutun, ayak banyosu uygulayın ve rasyonda Çinko/Biyotin destekli Koyun Premiksini aksatmayın."
    );
  }
  if (input.asi_durumu === "hayir" || input.asi_durumu === "bilmiyorum") {
    warnings.push(
      "💉 Enterotoksemi (Çelerme / Pulpy Kidney) aşısını doğuma 4 hafta kala mutlaka yaptır; hem anne koyunu hem doğacak kuzuları ani ölümden korur."
    );
  }

  return {
    requirements: req,
    items: rationItems,
    summary,
    risks,
    warnings
  };
}

/**
 * 6 Hazır Senaryo (Preset)
 */
export const DAIRY_SHEEP_PRESETS = {
  ivesi_orta_1_5L: {
    id: "ivesi_orta_1_5L",
    title: "🥛 Orta Verimli İvesi (1,5 L Süt)",
    subtitle: "55 kg İvesi, orta laktasyon, %6,5 yağ — NRC 2007 Referans Rasyonu",
    input: {
      donem: "orta",
      sut_verimi_l: 1.5,
      emzirme_durumu: "sadece_sagim",
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5,
      dogum_sayisi: 2,
      canli_agirlik_kg: 55,
      irk: "ivesi",
      vks: 3.0,
      suru_sayisi: 50,
      secilen_yemler: [
        "yonca_kuru",
        "misir_silaji",
        "arpa_samani",
        "arpa_ezmesi",
        "misir_kirmasi",
        "atk_36",
        "koyun_sut_yemi"
      ],
      serbest_yemleme: "evet",
      ogun_sayisi: 3,
      saglik_sorunlari: [],
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal",
      sagim_sekli: "makine_2",
      asi_durumu: "evet"
    }
  },
  sakiz_yuksek_2_5L: {
    id: "sakiz_yuksek_2_5L",
    title: "🏆 Yüksek Verimli Sakız (2,5 L Süt)",
    subtitle: "60 kg Sakız koyunu, erken laktasyon, yüksek süt ve peynir verimi",
    input: {
      donem: "erken",
      sut_verimi_l: 2.5,
      emzirme_durumu: "sadece_sagim",
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5,
      dogum_sayisi: 2,
      canli_agirlik_kg: 60,
      irk: "sakiz",
      vks: 3.0,
      suru_sayisi: 40,
      secilen_yemler: [
        "yonca_kuru",
        "misir_silaji",
        "arpa_ezmesi",
        "misir_kirmasi",
        "soya_46",
        "koyun_sut_yemi",
        "korunmus_yag",
        "karbonat_tampon"
      ],
      serbest_yemleme: "evet",
      ogun_sayisi: 3,
      saglik_sorunlari: [],
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal",
      sagim_sekli: "makine_2",
      asi_durumu: "evet"
    }
  },
  yerli_dusuk_0_8L: {
    id: "yerli_dusuk_0_8L",
    title: "🌾 Düşük Verimli Yerli Koyun (0,8 L Süt)",
    subtitle: "50 kg Kıvırcık / Akkaraman, geç laktasyon, yarım gün mera destekli",
    input: {
      donem: "gec",
      sut_verimi_l: 0.8,
      emzirme_durumu: "sadece_sagim",
      sut_yag_pct: 7.5,
      sut_protein_pct: 5.5,
      dogum_sayisi: 3,
      canli_agirlik_kg: 50,
      irk: "kivircik",
      vks: 3.0,
      suru_sayisi: 80,
      secilen_yemler: [
        "cayir_otu",
        "bugday_samani",
        "arpa_ezmesi",
        "bugday_kepegi",
        "atk_36"
      ],
      serbest_yemleme: "hayir",
      ogun_sayisi: 2,
      saglik_sorunlari: [],
      barinma: "yari_acik",
      mera_durumu: "yarim_mera",
      hava_durumu: "normal",
      sagim_sekli: "elle_2",
      asi_durumu: "evet"
    }
  },
  kuru_donem_ikiz: {
    id: "kuru_donem_ikiz",
    title: "🤰 Kuru Dönem Koyunu (İkiz Gebe)",
    subtitle: "Doğuma 3 hafta kalan 60 kg ikiz gebe koyun — Toksemi & Süt Ateşi Korumalı",
    input: {
      donem: "kuru_yakin",
      kuru_hafta: 3,
      fetus_sayisi: 2,
      sut_atesi_gecmisi: "evet",
      sut_verimi_l: 0,
      canli_agirlik_kg: 60,
      irk: "ivesi",
      vks: 3.25,
      suru_sayisi: 60,
      secilen_yemler: [
        "cayir_otu",
        "arpa_samani",
        "misir_silaji",
        "arpa_ezmesi",
        "bugday_kepegi",
        "soya_46"
      ],
      serbest_yemleme: "evet",
      ogun_sayisi: 3,
      saglik_sorunlari: [],
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal",
      asi_durumu: "evet"
    }
  },
  yeni_dogum_koyun: {
    id: "yeni_dogum_koyun",
    title: "🍼 Yeni Doğum Yapmış Koyun (0–2 Hafta)",
    subtitle: "58 kg yeni doğuran koyun, 1,8 L süt + tek kuzu emziren",
    input: {
      donem: "yeni_dogum",
      yeni_dogum_gun: "4_7",
      istahli_mi: "evet",
      ayaga_kalkabiliyor_mu: "evet",
      sut_verimi_l: 1.8,
      emzirme_durumu: "sagim_arti_1_kuzu",
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5,
      dogum_sayisi: 2,
      canli_agirlik_kg: 58,
      irk: "tahirova",
      vks: 3.0,
      suru_sayisi: 45,
      secilen_yemler: [
        "yonca_kuru",
        "cayir_otu",
        "arpa_ezmesi",
        "misir_kirmasi",
        "soya_46",
        "koyun_sut_yemi",
        "karbonat_tampon"
      ],
      serbest_yemleme: "evet",
      ogun_sayisi: 3,
      saglik_sorunlari: [],
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal",
      sagim_sekli: "makine_2",
      asi_durumu: "evet"
    }
  },
  ilk_dogum_sisek: {
    id: "ilk_dogum_sisek",
    title: "🐑 İlk Doğum Yapan Şişek (+%15 Büyüme Paylı)",
    subtitle: "48 kg ilk doğumunu yapmış genç koyun, 1,3 L süt",
    input: {
      donem: "ilk_dogum",
      sut_verimi_l: 1.3,
      emzirme_durumu: "sadece_sagim",
      sut_yag_pct: 6.5,
      sut_protein_pct: 5.5,
      dogum_sayisi: 1,
      canli_agirlik_kg: 48,
      irk: "ivesi",
      vks: 3.0,
      suru_sayisi: 35,
      secilen_yemler: [
        "yonca_kuru",
        "misir_silaji",
        "arpa_ezmesi",
        "misir_kirmasi",
        "atk_36",
        "koyun_sut_yemi"
      ],
      serbest_yemleme: "evet",
      ogun_sayisi: 3,
      saglik_sorunlari: [],
      barinma: "kapali_agil",
      mera_durumu: "hayir",
      hava_durumu: "normal",
      sagim_sekli: "makine_2",
      asi_durumu: "evet"
    }
  }
};
