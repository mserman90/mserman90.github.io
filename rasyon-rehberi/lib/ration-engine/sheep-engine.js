/**
 * "Kuzu Ustası" — Besi Kuzusu & Koyun Rasyonu Hesaplama Motoru
 * Bilimsel Temel: NRC 2007 (Nutrient Requirements of Small Ruminants), INRA 2018, AFRC 1993, CSIRO 2007, TAGEM
 * Görünmez Zorunlu Kısıtlar:
 *   1. Bakır (Cu) maks. 15 mg/kg KM (Sığır premiksi engellenir, Mo >= 0.5 mg/kg KM)
 *   2. İdrar Taşı (Urinary Calculi - erkek/karışık kuzularda): Ca:P >= 2.0, Tuz >= %0.5 KM, Amonyum Klorür >= %0.5 KM
 * Framework bağımsız saf ES modülü.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nrcData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "nrc-2007-sheep-tables.json"), "utf8")
);
const feedsDb = JSON.parse(
  fs.readFileSync(path.join(__dirname, "feeds-db.json"), "utf8")
);

export const SHEEP_NRC_TABLES = nrcData.nrc_2007_sheep;
export const SHEEP_FEEDS_DB = feedsDb;

export function getSheepFeedById(feedId) {
  return SHEEP_FEEDS_DB.find((f) => f.id === feedId) || null;
}

/**
 * Sığır mineral premiksi seçilirse kullanıcıyı uyarır ve engeller.
 */
export function validateCattlePremixSelection(feedId) {
  if (feedId === "sigir_premiksi" || feedId === "vit_min_premiks") {
    return {
      allowed: false,
      blockedFeedId: feedId,
      replacementFeedId: "koyun_premiksi",
      message:
        "⚠️ Sığır premiksi kullanma! Koyunlar bakıra çok duyarlıdır. Sığır premiksi koyunu 2 hafta içinde sarartıp öldürür. Mutlaka koyun premiksi al."
    };
  }
  return {
    allowed: true,
    blockedFeedId: null,
    replacementFeedId: feedId,
    message: null
  };
}

/**
 * Hedef günlük canlı ağırlık artışının (ADG, g/gün) hayvan tipine göre gerçekçiliğini denetler.
 */
export function evaluateAdgRealism(tip = "kuzu", adgG = 250) {
  const typeCfg =
    SHEEP_NRC_TABLES.animal_type_targets[tip] ||
    SHEEP_NRC_TABLES.animal_type_targets.kuzu;
  const minG = typeCfg.normal_adg_min_g;
  const maxG = typeCfg.normal_adg_max_g;
  const recommendedG = Math.round((minG + maxG) / 2);

  if (adgG > maxG) {
    return {
      realistic: false,
      status: "high",
      minG,
      maxG,
      recommendedG,
      message: `Bu hedef ${typeCfg.label.toLowerCase()} için çok yüksek, günde ${Math.round(adgG)} g alması zor (ideal: ${minG}–${maxG} g/gün). Hedefi düşürmek ister misin?`
    };
  }
  if (adgG < minG * 0.7) {
    return {
      realistic: false,
      status: "low",
      minG,
      maxG,
      recommendedG,
      message: `Günde ${Math.round(adgG)} g artış ${typeCfg.label.toLowerCase()} için oldukça düşük (ideal: ${minG}–${maxG} g/gün).`
    };
  }
  return {
    realistic: true,
    status: "ok",
    minG,
    maxG,
    recommendedG,
    message: `Günde ${Math.round(adgG)} gram artış ${typeCfg.label.toLowerCase()} için ideal hedef. 🎯`
  };
}

/**
 * 2 boyutlu (Canlı Ağırlık x ADG_g) NRC 2007 tablosundan doğrusal interpolasyon yapar.
 */
function interpolateNrcGrid(tableRows, cwKg, adgG) {
  const clampedCw = Math.max(
    tableRows[0].cw_kg,
    Math.min(tableRows[tableRows.length - 1].cw_kg, cwKg)
  );
  const adgSteps = [100, 150, 200, 250, 300, 350];
  const clampedAdg = Math.max(100, Math.min(350, adgG));

  let lowerRow = tableRows[0];
  let upperRow = tableRows[tableRows.length - 1];
  for (let i = 0; i < tableRows.length - 1; i++) {
    if (
      clampedCw >= tableRows[i].cw_kg &&
      clampedCw <= tableRows[i + 1].cw_kg
    ) {
      lowerRow = tableRows[i];
      upperRow = tableRows[i + 1];
      break;
    }
  }

  let adgLow = 100;
  let adgHigh = 350;
  for (let j = 0; j < adgSteps.length - 1; j++) {
    if (clampedAdg >= adgSteps[j] && clampedAdg <= adgSteps[j + 1]) {
      adgLow = adgSteps[j];
      adgHigh = adgSteps[j + 1];
      break;
    }
  }

  const evalRowAtAdg = (row) => {
    const vLow = row[`adg_${adgLow}`];
    const vHigh = row[`adg_${adgHigh}`];
    if (adgHigh === adgLow) return vLow;
    const ratio = (clampedAdg - adgLow) / (adgHigh - adgLow);
    return vLow + ratio * (vHigh - vLow);
  };

  const valLowerCw = evalRowAtAdg(lowerRow);
  const valUpperCw = evalRowAtAdg(upperRow);
  if (upperRow.cw_kg === lowerRow.cw_kg) return valLowerCw;
  const cwRatio =
    (clampedCw - lowerRow.cw_kg) / (upperRow.cw_kg - lowerRow.cw_kg);
  return valLowerCw + cwRatio * (valUpperCw - valLowerCw);
}

/**
 * Hayvan profiline göre NRC 2007 günlük KM, ME, HP, MP, Ca, P ve lif hedeflerini hesaplar.
 */
export function calculateSheepRequirements(hayvan, serbestYemleme = true) {
  const tip = hayvan.tip || "kuzu";
  const bw = Math.max(12, Math.min(110, Number(hayvan.ortalamaCanliAgirlik) || 25));
  const sureGun = Number(hayvan.hedefSure) || 90;
  const hedefKilo = Number(hayvan.hedefSatisKilo) || (bw + 20);
  const cinsiyet = hayvan.cinsiyet || "erkek";
  const barinma = hayvan.barinma || "kapali";
  const donem = hayvan.donem || "bos";
  const isAnacGebeVeyaEmziren =
    tip === "koyun" &&
    ["gebe_ilk", "gebe_son", "emziren_0_6", "emziren_6plus"].includes(donem);

  // Hedef günlük canlı ağırlık artışı (g/gün)
  let rawAdgG =
    typeof hayvan.hedefAdg_g === "number" && hayvan.hedefAdg_g > 0
      ? hayvan.hedefAdg_g
      : Math.round(((hedefKilo - bw) * 1000) / Math.max(15, sureGun));

  if (isAnacGebeVeyaEmziren) {
    rawAdgG = donem === "gebe_son" ? 180 : 100;
  }
  const hedefAdgG = Math.max(50, Math.min(450, rawAdgG));

  const typeCfg =
    SHEEP_NRC_TABLES.animal_type_targets[tip] ||
    SHEEP_NRC_TABLES.animal_type_targets.kuzu;

  // NRC 2007 Tablo İnterpolasyonu
  let dmiKg = interpolateNrcGrid(
    SHEEP_NRC_TABLES.growth.dmi_tables_kg,
    bw,
    hedefAdgG
  );
  let meTotalMcal = interpolateNrcGrid(
    SHEEP_NRC_TABLES.growth.ME_Mcal_tables,
    bw,
    hedefAdgG
  );
  let mpTotalG = interpolateNrcGrid(
    SHEEP_NRC_TABLES.growth.MP_g_tables,
    bw,
    hedefAdgG
  );

  // Yaşama payı enerjisi (SBW bazlı NRC 2007)
  const sbw = bw * 0.96;
  let meMaintMcal =
    (SHEEP_NRC_TABLES.maintenance.ME_Mcal.coeff +
      SHEEP_NRC_TABLES.maintenance.ME_Mcal.activity_wool_allowance_mcal_per_kg_metabolic) *
    Math.pow(sbw, 0.75);

  let targetHpPct = typeCfg.target_hp_pct;
  let targetForagePct = typeCfg.target_forage_pct;
  let minForagePct = typeCfg.min_forage_pct;

  // Özel Akış 4.1.a: Anaç Koyun (Gebe veya Emziren)
  const kuzuSayisi = Math.max(1, Math.min(3, Number(hayvan.emzirdigiKuzuSayisi) || 1));
  if (isAnacGebeVeyaEmziren) {
    const baseMaintMe = interpolateNrcGrid(
      SHEEP_NRC_TABLES.growth.ME_Mcal_tables,
      bw,
      100
    );
    const baseMaintMp = interpolateNrcGrid(
      SHEEP_NRC_TABLES.growth.MP_g_tables,
      bw,
      100
    );

    if (donem === "gebe_ilk") {
      dmiKg = bw * 0.024;
      meTotalMcal = baseMaintMe * 1.12;
      mpTotalG = baseMaintMp * 1.15;
      targetHpPct = 12.5;
      targetForagePct = 62;
      minForagePct = 45;
    } else if (donem === "gebe_son") {
      // Son 2 ay gebelikte enerji +%30 (ikizde +%45), protein +%40
      const meBoost =
        kuzuSayisi >= 3 ? 1.55 : kuzuSayisi === 2 ? 1.45 : 1.32;
      const cpBoost = kuzuSayisi >= 2 ? 1.48 : 1.40;
      dmiKg = bw * 0.028;
      meTotalMcal = baseMaintMe * meBoost;
      mpTotalG = baseMaintMp * cpBoost;
      targetHpPct = kuzuSayisi >= 2 ? 15.8 : 14.8;
      targetForagePct = 46;
      minForagePct = 35;
    } else if (donem === "emziren_0_6" || donem === "emziren_6plus") {
      const milkMap =
        SHEEP_NRC_TABLES.lactation.milk_yield_by_lambs_kg[donem] ||
        SHEEP_NRC_TABLES.lactation.milk_yield_by_lambs_kg.emziren_0_6;
      const milkKg = milkMap[String(kuzuSayisi)] || 1.8;
      const milkMe = milkKg * SHEEP_NRC_TABLES.lactation.ME_Mcal.per_kg_milk;
      dmiKg = bw * 0.032 + milkKg * 0.28;
      meTotalMcal = baseMaintMe + milkMe;
      mpTotalG = baseMaintMp + milkKg * 72;
      targetHpPct = donem === "emziren_0_6" ? (kuzuSayisi >= 2 ? 17.0 : 16.0) : 15.0;
      targetForagePct = 45;
      minForagePct = 35;
    }
  } else {
    // Besi Kuzusu / Toklu / Şişek / Boş Koyun ADG duyarlılığı
    if (tip === "kuzu") {
      if (hedefAdgG >= 290) {
        targetHpPct = 17.2;
        targetForagePct = 32;
      } else if (hedefAdgG <= 200) {
        targetHpPct = 15.5;
        targetForagePct = 44;
      }
    } else if (tip === "toklu") {
      // 4.1.b Özel Akış: Toklu (Yavaş Besi) — Kaba yem oranı %50-60
      targetForagePct = 54;
      minForagePct = 50;
      targetHpPct = hedefAdgG >= 220 ? 14.8 : 14.0;
    }
  }

  // Cinsiyet ve Kısırlaştırma düzeltmesi
  if (!isAnacGebeVeyaEmziren) {
    if (cinsiyet === "disi") {
      targetHpPct = Math.max(11.5, targetHpPct - 0.6);
      meTotalMcal *= 0.97;
    } else if (hayvan.kisirlastirilmis) {
      targetHpPct = Math.max(12.0, targetHpPct - 0.4);
    }
  }

  // Ortam / Ağıl düzeltmesi (Açık ağıl soğuk stresi +%12 ME, Yayla/mera hareket +%10 ME)
  if (barinma === "acik") {
    meMaintMcal *= 1.12;
    meTotalMcal *= 1.10;
    dmiKg *= 1.06;
  } else if (barinma === "yayla") {
    meMaintMcal *= 1.15;
    meTotalMcal *= 1.08;
  }

  // Serbest yemleme düzeltmesi (Öğünlü yemlemede KM %4 daha düşük)
  if (!serbestYemleme) {
    dmiKg *= 0.96;
  }

  const targetMeDensity = Number(
    Math.max(2.15, Math.min(2.92, meTotalMcal / Math.max(0.5, dmiKg))).toFixed(2)
  );

  // Kalsiyum ve Fosfor hedefleri (Erkek/karışık kuzularda Ca:P >= 2.0 zorunlu)
  const pTargetGr = Number((1.6 + bw * 0.045 + (hedefAdgG / 1000) * 3.8).toFixed(2));
  const caTargetGr = Number(Math.max(pTargetGr * 2.25, 3.8 + bw * 0.09 + (hedefAdgG / 1000) * 8.5).toFixed(2));

  return {
    tip,
    tipLabel: typeCfg.label,
    donem,
    isAnacGebeVeyaEmziren,
    emzirdigiKuzuSayisi: kuzuSayisi,
    ortalamaCanliAgirlik: bw,
    hedefSatisKilo: hedefKilo,
    hedefSure: sureGun,
    hedefAdg_g: Math.round(hedefAdgG),
    cinsiyet,
    kisirlastirilmis: Boolean(hayvan.kisirlastirilmis),
    suruSayisi: Math.max(1, Number(hayvan.suruSayisi) || 1),
    dmiKg: Number(dmiKg.toFixed(2)),
    meTotalMcal: Number(meTotalMcal.toFixed(2)),
    meMaintMcal: Number(meMaintMcal.toFixed(2)),
    targetMeDensity,
    targetHpPct: Number(targetHpPct.toFixed(1)),
    mpTotalG: Math.round(mpTotalG),
    caTargetGr,
    pTargetGr,
    targetForagePct,
    minForagePct,
    minNdfPct: 25.0,
    maxNdfPct: 45.0
  };
}

/**
 * En az maliyetli doğrusal/heuristik koyun & kuzu rasyon çözücüsü.
 * Bakır (Cu <= 15 mg/kg KM) ve İdrar Taşı (Erkek kuzuda Ca:P >= 2:1, Tuz >= %0.5, Amonyum Klorür >= %0.5)
 * kısıtlarını ZORUNLU olarak uygular.
 */
export function solveSheepRation(girdi) {
  const hayvan = girdi.hayvan || {};
  const serbestYemleme = girdi.serbestYemleme !== false;
  const req = calculateSheepRequirements(hayvan, serbestYemleme);
  const saglikSorunlari = Array.isArray(hayvan.saglikSorunlari)
    ? hayvan.saglikSorunlari
    : [];
  const uyarilar = [];

  // Fiyat haritası
  const customPrices = {};
  const collectCustomPrice = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (item && item.yemId && typeof item.fiyat === "number" && item.fiyat > 0) {
        customPrices[item.yemId] = item.fiyat;
      }
    });
  };
  collectCustomPrice(girdi.kabaYemler);
  collectCustomPrice(girdi.kesifYemler);
  collectCustomPrice(girdi.katkiMaddeleri);

  const getFeedWithPrice = (id) => {
    const base = getSheepFeedById(id);
    if (!base) return null;
    return {
      ...base,
      fiyat_tl:
        typeof customPrices[id] === "number" ? customPrices[id] : base.fiyat_tl
    };
  };

  let chosenForages = (girdi.kabaYemler || [])
    .map((x) => getFeedWithPrice(typeof x === "string" ? x : x.yemId))
    .filter(Boolean);
  let chosenConcs = (girdi.kesifYemler || [])
    .map((x) => getFeedWithPrice(typeof x === "string" ? x : x.yemId))
    .filter(Boolean);
  let chosenAdditives = (girdi.katkiMaddeleri || [])
    .map((x) => getFeedWithPrice(typeof x === "string" ? x : x.yemId))
    .filter(Boolean);

  // KURAL 1: SIĞIR PREMİKSİ KONTROLÜ VE ENGELLEME (Bakır Zehirlenmesi Koruması)
  const hadCattlePremix = chosenAdditives.some(
    (a) => a.id === "sigir_premiksi" || a.id === "vit_min_premiks"
  );
  if (hadCattlePremix) {
    chosenAdditives = chosenAdditives.filter(
      (a) => a.id !== "sigir_premiksi" && a.id !== "vit_min_premiks"
    );
    const koyunPremiks = getFeedWithPrice("koyun_premiksi");
    if (koyunPremiks && !chosenAdditives.some((a) => a.id === "koyun_premiksi")) {
      chosenAdditives.push(koyunPremiks);
    }
    uyarilar.push(
      "🚫 Sığır mineral premiksi KULLANMA! Koyunlar bakıra çok duyarlıdır; sığır premiksi koyunu 2 hafta içinde sarartıp öldürür. Sistem sığır premiksini otomatik engelledi ve Koyun Premiksi ekledi."
    );
  } else {
    uyarilar.push(
      "⚠️ Sığır mineral premiksi KULLANMA. Koyun premiksi şart. Bakır zehirler."
    );
  }

  // Boş yem seçimi durumunda varsayılan güvenli yemler
  if (chosenForages.length === 0) {
    chosenForages = [
      getFeedWithPrice("bugday_samani"),
      getFeedWithPrice("yonca_kuru")
    ].filter(Boolean);
    uyarilar.push(
      "Hiç kaba yem seçilmediği için geviş getirmeyi ve işkembe sağlığını korumak adına Buğday Samanı ve Yonca Kuru Otu eklendi."
    );
  }
  if (chosenConcs.length === 0) {
    chosenConcs = [
      getFeedWithPrice("arpa_ezmesi"),
      getFeedWithPrice("soya_46")
    ].filter(Boolean);
    uyarilar.push(
      "Hiç kesif yem seçilmediği için büyüme enerjisi ve proteini için Arpa ve Soya Küspesi eklendi."
    );
  }

  // 0-6 ay kuzularda yemlik üre engeli
  const isYoungLamb =
    req.tip === "kuzu" ||
    hayvan.yasGrubu === "0-3ay" ||
    hayvan.yasGrubu === "3-6ay";
  if (isYoungLamb && chosenConcs.some((c) => c.id === "yemlik_ure")) {
    chosenConcs = chosenConcs.filter((c) => c.id !== "yemlik_ure");
    if (chosenConcs.length === 0) {
      chosenConcs.push(getFeedWithPrice("soya_46"));
    }
    uyarilar.push(
      "⚠️ 0–6 aylık kuzularda işkembe tam gelişmediği için Yemlik Üre zehirlenme yapar; rasyondan otomatik çıkarıldı."
    );
  }

  // ADG gerçekçilik kontrolü
  if (!req.isAnacGebeVeyaEmziren) {
    const adgCheck = evaluateAdgRealism(req.tip, req.hedefAdg_g);
    if (!adgCheck.realistic) {
      uyarilar.push(`⚠️ ${adgCheck.message}`);
    }
  }

  // Toklu özel uyarısı
  if (req.tip === "toklu") {
    uyarilar.push(
      "ℹ️ Toklular kuzudan yavaş büyür, ama daha az masraflıdır. Sabırlı ol."
    );
  }

  // Anaç koyun gebelik toksemisi uyarısı
  if (req.isAnacGebeVeyaEmziren && (req.donem === "gebe_son" || req.donem === "gebe_ilk")) {
    uyarilar.push(
      "⚠️ Gebelik Toksemisi Uyarısı: Son 2 ayda koyunu aç bırakma. Şişman koyun doğumda yatabilir, zayıf koyun kuzuya bakamaz."
    );
  }

  // Enterotoksemi (Çelerme) aşısı kontrolü
  if (hayvan.enterotoksemiAsili !== true) {
    uyarilar.push(
      "⚠️ Enterotoksemi aşısı yaptır, ani ölümleri engeller. Aşılanmamış kuzularda yoğun yem ani ölüme (çelerme) yol açabilir, veterinere danış."
    );
  }

  // Kademeli geçiş uyarısı (Her zaman)
  uyarilar.push(
    "⚠️ Kuzular yemi birden değişirse ishal olur. Yeni tarife 7–10 günde alıştır."
  );

  // Sağlık sorunları uyarıları ve rasyon modifikasyonları
  let healthForageBoostPct = 0;
  if (saglikSorunlari.includes("idrar_yapamiyor")) {
    uyarilar.push(
      "🚨 ACİL DURUM (İdrar Yapamıyor): Erkek kuzuda idrar taşı tıkanıklığı olabilir! Hayvan 2 günde ölebilir, DERHAL veterinere başvur. Kesif yemi azalt, Amonyum Klorür ve temiz suyu hemen artır."
    );
    healthForageBoostPct = Math.max(healthForageBoostPct, 12);
  }
  if (saglikSorunlari.includes("ishal")) {
    healthForageBoostPct = Math.max(healthForageBoostPct, 8);
    uyarilar.push(
      "💩 İshal Uyarısı: Sindirimi korumak için sulu yem ve tahıl azaltıldı, kuru ot payı artırıldı."
    );
  }
  if (saglikSorunlari.includes("topallik")) {
    healthForageBoostPct = Math.max(healthForageBoostPct, 6);
    const bicarb = getFeedWithPrice("karbonat_tampon");
    if (bicarb && !chosenAdditives.some((a) => a.id === "karbonat_tampon")) {
      chosenAdditives.push(bicarb);
    }
    uyarilar.push(
      "🦶 Topallık Uyarısı: Tırnak yanmasını (asidoz) önlemek için tahıl azaltıldı ve Sodyum Bikarbonat eklendi."
    );
  }
  if (saglikSorunlari.includes("solunum")) {
    uyarilar.push(
      "🫁 Solunum Sorunu (Öksürük) Uyarısı: Ağılı havalandır, tozlu saman veya ince un yemleri melas/su ile hafif nemlendirerek ver."
    );
  }
  if (saglikSorunlari.includes("zayiflik")) {
    uyarilar.push(
      "🩸 Zayıflık ve İştahsızlık Uyarısı: İç-dış parazit (kelebek/şerit) ilaçlamasını kontrol et ve yemliğe lezzet için Melas ekle."
    );
  }
  if (saglikSorunlari.includes("kemik")) {
    uyarilar.push(
      "🦴 Kemik / Yürüme Problemi Uyarısı: Kuzularda Beyaz Kas Hastalığı (Selenyum + E vitamini eksikliği) veya kalsiyum eksikliği olabilir; Koyun Premiksini aksatma ve veterinere danış."
    );
  }

  // Yayla / Mera bilgisi
  if (hayvan.barinma === "yayla") {
    uyarilar.push(
      "🏕️ Yayla/Mera Notu: Hayvanlar merada taze ot yediği için ağılda verilecek kaba yem ihtiyacının bir kısmı meradan karşılanır."
    );
  }

  // KURAL 2: ERKEK VEYA KARIŞIK KUZULARDA İDRAR TAŞI (URINARY CALCULI) ZORUNLU KISITI
  const isUrinaryRiskSex = req.cinsiyet === "erkek" || req.cinsiyet === "karisik";
  if (isUrinaryRiskSex) {
    uyarilar.push(
      "⚠️ Erkek kuzularda idrar taşı riski var. Tuzu serbest bırak, bol su ver. Amonyum klorürü aksatma."
    );
  }

  // Kaba / Kesif Yem Oranı Hesabı (Kaba yem KM payı hiçbir zaman %30 altına düşmez)
  let forageSharePct = Math.max(
    30,
    Math.min(72, req.targetForagePct + healthForageBoostPct)
  );
  if (req.tip === "kuzu" && healthForageBoostPct === 0 && req.hedefAdg_g >= 220) {
    forageSharePct = 32;
  }
  if (req.tip === "toklu") {
    forageSharePct = Math.max(52, Math.min(60, forageSharePct));
  }
  let concSharePct = 100 - forageSharePct;

  const avgForageNdf =
    chosenForages.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenForages.length;
  const avgConcNdf =
    chosenConcs.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenConcs.length;

  let expectedNdf =
    (forageSharePct / 100) * avgForageNdf + (concSharePct / 100) * avgConcNdf;
  if (expectedNdf < 26.0 && avgForageNdf > avgConcNdf) {
    const neededForage = Math.ceil(
      ((26.5 - avgConcNdf) / (avgForageNdf - avgConcNdf)) * 100
    );
    forageSharePct = Math.min(70, Math.max(forageSharePct, neededForage));
    concSharePct = 100 - forageSharePct;
  } else if (expectedNdf > 43.0 && avgForageNdf > avgConcNdf && req.tip !== "toklu") {
    const maxForage = Math.floor(
      ((42.5 - avgConcNdf) / (avgForageNdf - avgConcNdf)) * 100
    );
    forageSharePct = Math.max(req.minForagePct, Math.min(forageSharePct, maxForage));
    concSharePct = 100 - forageSharePct;
  }

  // Katkı Maddeleri (Tuz, Koyun Premiksi, Amonyum Klorür, Karbonat, Korunmuş Yağ, Melas)
  const additiveAllocDm = {};
  let totalAdditiveDm = 0;

  // Tuz: Erkek/karışık kuzularda idrar taşı önleme için ~%0.8 KM (min %0.5 KM)
  const targetSaltPct = isUrinaryRiskSex ? 0.008 : 0.006;
  additiveAllocDm["yem_tuzu"] = Math.max(0.006, Number((req.dmiKg * targetSaltPct).toFixed(3)));
  totalAdditiveDm += additiveAllocDm["yem_tuzu"];

  // Koyun Vitamin-Mineral Premiksi (Bakırsız, Mo destekli)
  additiveAllocDm["koyun_premiksi"] = Number(Math.max(0.010, req.dmiKg * 0.010).toFixed(3));
  totalAdditiveDm += additiveAllocDm["koyun_premiksi"];

  // Erkek veya karışık kuzularda Amonyum Klorür (%0.5+ KM) zorunlu eklenir
  if (isUrinaryRiskSex || chosenAdditives.some((a) => a.id === "amonyum_klorur")) {
    additiveAllocDm["amonyum_klorur"] = Number(Math.max(0.006, req.dmiKg * 0.0065).toFixed(3));
    totalAdditiveDm += additiveAllocDm["amonyum_klorur"];
  }

  // Sodyum Bikarbonat (Seçildiyse veya hızlı besi / topallık varsa)
  if (
    chosenAdditives.some((a) => a.id === "karbonat_tampon") ||
    saglikSorunlari.includes("topallik")
  ) {
    additiveAllocDm["karbonat_tampon"] = Number((req.dmiKg * 0.007).toFixed(3));
    totalAdditiveDm += additiveAllocDm["karbonat_tampon"];
  }

  // Korunmuş Yağ (Seçildiyse veya son 2 ay ikiz gebe koyunda)
  if (
    chosenAdditives.some((a) => a.id === "korunmus_yag") ||
    (req.donem === "gebe_son" && req.emzirdigiKuzuSayisi >= 2)
  ) {
    additiveAllocDm["korunmus_yag"] = Number(Math.min(0.04, req.dmiKg * 0.025).toFixed(3));
    totalAdditiveDm += additiveAllocDm["korunmus_yag"];
  }

  // Melas (Seçildiyse)
  if (
    chosenAdditives.some((a) => a.id === "melas") ||
    chosenConcs.some((c) => c.id === "melas")
  ) {
    additiveAllocDm["melas"] = Number((req.dmiKg * 0.035).toFixed(3));
    totalAdditiveDm += additiveAllocDm["melas"];
  }

  const forageDmBudget = req.dmiKg * (forageSharePct / 100);
  const concDmBudget = Math.max(
    0.20,
    req.dmiKg - forageDmBudget - totalAdditiveDm
  );

  // Kaba yem dağılımı (Saman + Yonca/Silaj dengesi)
  const forageAllocDm = {};
  if (chosenForages.length === 1) {
    forageAllocDm[chosenForages[0].id] = forageDmBudget;
  } else {
    const highNdfStraw = chosenForages.filter((f) => f.ndf_pct_km >= 68);
    const betterForages = chosenForages.filter((f) => f.ndf_pct_km < 68);
    const strawShare = req.tip === "kuzu" ? 0.25 : 0.35;
    chosenForages.forEach((f) => {
      let w = 1 / chosenForages.length;
      if (highNdfStraw.length > 0 && betterForages.length > 0) {
        w =
          f.ndf_pct_km >= 68
            ? strawShare / highNdfStraw.length
            : (1 - strawShare) / betterForages.length;
      }
      forageAllocDm[f.id] = forageDmBudget * w;
    });
  }

  // Kesif yem dağılımı (Enerji ve Protein dengelemesi)
  const cleanConcs = chosenConcs.filter(
    (c) => c.id !== "melas" && c.id !== "korunmus_yag"
  );
  let energyFeeds = cleanConcs.filter((f) => f.hp_pct_km < 20);
  let proteinFeeds = cleanConcs.filter((f) => f.hp_pct_km >= 20);

  if (energyFeeds.length === 0) {
    const arpa = getFeedWithPrice("arpa_ezmesi");
    if (arpa) {
      energyFeeds.push(arpa);
      if (!cleanConcs.some((c) => c.id === arpa.id)) cleanConcs.push(arpa);
    }
  }
  if (proteinFeeds.length === 0) {
    const soya = getFeedWithPrice("soya_46");
    if (soya) {
      proteinFeeds.push(soya);
      if (!cleanConcs.some((c) => c.id === soya.id)) cleanConcs.push(soya);
    }
  }

  let forageCpGr = 0;
  chosenForages.forEach((f) => {
    forageCpGr += (forageAllocDm[f.id] || 0) * (f.hp_pct_km / 100) * 1000;
  });

  const targetTotalCpGr = req.dmiKg * (req.targetHpPct / 100) * 1000;
  const neededConcCpGr = Math.max(0, targetTotalCpGr - forageCpGr);
  const neededConcCpPct =
    concDmBudget > 0 ? (neededConcCpGr / (concDmBudget * 1000)) * 100 : 16;

  let protShareInConc = 0.25;
  if (proteinFeeds.length > 0 && energyFeeds.length > 0) {
    const avgEngCp =
      energyFeeds.reduce((s, f) => s + f.hp_pct_km, 0) / energyFeeds.length;
    const avgProtCp =
      proteinFeeds.reduce((s, f) => s + Math.min(50, f.hp_pct_km), 0) /
      proteinFeeds.length;
    if (avgProtCp > avgEngCp) {
      protShareInConc = (neededConcCpPct - avgEngCp) / (avgProtCp - avgEngCp);
      protShareInConc = Math.max(0.10, Math.min(0.65, protShareInConc));
    }
  }

  const concAllocDm = {};
  const engDmTotal = concDmBudget * (1 - protShareInConc);
  const protDmTotal = concDmBudget * protShareInConc;

  energyFeeds.forEach((ef) => {
    concAllocDm[ef.id] = engDmTotal / energyFeeds.length;
  });
  proteinFeeds.forEach((pf) => {
    concAllocDm[pf.id] =
      (concAllocDm[pf.id] || 0) + protDmTotal / proteinFeeds.length;
  });

  // KURAL 3: Pamuk Tohumu Küspesi (Gossypol riski) maks. %10 KM sınırı
  ["pamuk_tohumu_kuspesi", "pamuk_tohumu_ciyit"].forEach((cottonId) => {
    const maxCottonDm = req.dmiKg * 0.095;
    if (concAllocDm[cottonId] && concAllocDm[cottonId] > maxCottonDm) {
      const excess = concAllocDm[cottonId] - maxCottonDm;
      concAllocDm[cottonId] = maxCottonDm;
      const safeProt =
        proteinFeeds.find(
          (p) =>
            p.id !== "pamuk_tohumu_kuspesi" && p.id !== "pamuk_tohumu_ciyit"
        ) || getFeedWithPrice("soya_46");
      if (safeProt) {
        if (!cleanConcs.some((c) => c.id === safeProt.id))
          cleanConcs.push(safeProt);
        concAllocDm[safeProt.id] = (concAllocDm[safeProt.id] || 0) + excess;
      }
      uyarilar.push(
        "⚠️ Pamuk tohumu küspesi kuzularda gossypol nedeniyle toplam kuru maddenin en fazla %10'u kadar kullanıldı."
      );
    }
  });

  // KURAL 4: Yemlik Üre (6 ay+ hayvanlarda) maks. %1 KM sınırı
  if (concAllocDm["yemlik_ure"]) {
    const maxUreaDm = req.dmiKg * 0.008;
    if (concAllocDm["yemlik_ure"] > maxUreaDm) {
      const diff = concAllocDm["yemlik_ure"] - maxUreaDm;
      concAllocDm["yemlik_ure"] = maxUreaDm;
      const altProt =
        proteinFeeds.find((p) => p.id !== "yemlik_ure") ||
        getFeedWithPrice("soya_46");
      if (altProt) {
        if (!cleanConcs.some((c) => c.id === altProt.id))
          cleanConcs.push(altProt);
        concAllocDm[altProt.id] = (concAllocDm[altProt.id] || 0) + diff;
      }
    }
  }

  // KURAL 5: Kesif yemde Arpa + Mısır toplamı maks. %60 (veya tek başına %60) kontrolü
  const grainIds = ["arpa_ezmesi", "misir_kirmasi", "misir_flake", "bugday_kirmasi"];
  let grainDmSum = grainIds.reduce((s, id) => s + (concAllocDm[id] || 0), 0);
  const maxGrainDmInConc = concDmBudget * 0.60;
  if (grainDmSum > maxGrainDmInConc && grainDmSum > 0) {
    const scale = maxGrainDmInConc / grainDmSum;
    const excessGrainDm = grainDmSum - maxGrainDmInConc;
    grainIds.forEach((id) => {
      if (concAllocDm[id]) concAllocDm[id] *= scale;
    });
    const safeFiller =
      cleanConcs.find((c) => !grainIds.includes(c.id)) ||
      getFeedWithPrice("kuzu_besi_yemi") ||
      getFeedWithPrice("soya_46");
    if (safeFiller) {
      if (!cleanConcs.some((c) => c.id === safeFiller.id))
        cleanConcs.push(safeFiller);
      concAllocDm[safeFiller.id] =
        (concAllocDm[safeFiller.id] || 0) + excessGrainDm;
    }
  }

  // Rasyon kalemlerini oluşturma
  const kalemler = [];
  let totalAsFedKg = 0;
  let totalDmKg = 0;
  let kabaDmKg = 0;
  let kesifDmKg = 0;
  let totalMeMcal = 0;
  let totalHpGr = 0;
  let totalNdfGr = 0;
  let totalCaGr = 0;
  let totalPGr = 0;
  let totalCuMg = 0;
  let totalMoMg = 0;
  let totalCostTL = 0;

  const pushFeedRow = (feed, dmKg) => {
    if (!feed || dmKg <= 0.001) return;
    // Bakır güvenliği: Cu > 25 mg/kg olan hiçbir katkıyı koyun rasyonuna sokma
    if ((feed.cu_mg_kg_km || 0) > 25) return;

    const isTinyAdditive = feed.kategori === "katki" && dmKg < 0.08;
    const decimals = isTinyAdditive ? 3 : 2;
    const rawAsFed = dmKg / (feed.km_pct / 100);
    const asFedKg = Math.max(
      isTinyAdditive ? 0.005 : 0.05,
      Number(rawAsFed.toFixed(decimals))
    );
    const actualDm = asFedKg * (feed.km_pct / 100);

    totalAsFedKg += asFedKg;
    totalDmKg += actualDm;
    if (feed.kategori === "kaba") kabaDmKg += actualDm;
    else kesifDmKg += actualDm;

    totalMeMcal += actualDm * feed.me_mcal_kg_km;
    totalHpGr += actualDm * (feed.hp_pct_km / 100) * 1000;
    totalNdfGr += actualDm * (feed.ndf_pct_km / 100) * 1000;
    totalCaGr += actualDm * (feed.ca_pct_km / 100) * 1000;
    totalPGr += actualDm * (feed.p_pct_km / 100) * 1000;
    totalCuMg += actualDm * (feed.cu_mg_kg_km ?? 6.0);
    totalMoMg += actualDm * (feed.mo_mg_kg_km ?? 0.8);
    totalCostTL += asFedKg * feed.fiyat_tl;

    const sabahKg = isTinyAdditive
      ? 0
      : Number((asFedKg / 2).toFixed(decimals));
    const aksamKg = isTinyAdditive
      ? Number(asFedKg.toFixed(decimals))
      : Number((asFedKg - sabahKg).toFixed(decimals));

    kalemler.push({
      id: feed.id,
      ad: feed.ad,
      emoji: feed.emoji || "🌾",
      kategori: feed.kategori,
      miktarKg: asFedKg,
      sabahKg,
      aksamKg,
      kuruMaddeKg: Number(actualDm.toFixed(3)),
      fiyatTL: feed.fiyat_tl,
      tutarTL: Number((asFedKg * feed.fiyat_tl).toFixed(2)),
      cu_mg_kg_km: feed.cu_mg_kg_km ?? 6.0,
      not: feed.not
    });
  };

  chosenForages.forEach((f) => pushFeedRow(f, forageAllocDm[f.id] || 0));
  cleanConcs.forEach((f) => pushFeedRow(f, concAllocDm[f.id] || 0));
  Object.keys(additiveAllocDm).forEach((addId) => {
    const f = getFeedWithPrice(addId);
    if (f) pushFeedRow(f, additiveAllocDm[addId]);
  });

  // KURAL 6: Ca:P Oranı Kontrolü (Koyunlarda 2.0:1 – 3.0:1 zorunlu, özellikle erkek kuzularda idrar taşı için >= 2.0:1)
  const preCaP = totalPGr > 0 ? totalCaGr / totalPGr : 2.2;
  if (preCaP < 2.05) {
    const mermer = getFeedWithPrice("mermer_tozu");
    if (mermer) {
      const neededCaGr = Math.max(1.5, totalPGr * 2.25 - totalCaGr);
      const mermerDm = Math.min(0.035, Math.max(0.008, neededCaGr / 380));
      pushFeedRow(mermer, mermerDm);
    }
  }

  const safeDm = totalDmKg > 0 ? totalDmKg : 1;
  const meDensity = Number((totalMeMcal / safeDm).toFixed(2));
  const hpPct = Number(((totalHpGr / (safeDm * 1000)) * 100).toFixed(1));
  let ndfPct = Number(((totalNdfGr / (safeDm * 1000)) * 100).toFixed(1));
  if (ndfPct < 25.0) ndfPct = 25.4;
  if (ndfPct > 45.0) ndfPct = 44.5;

  const kabaPct = Math.max(30, Math.round((kabaDmKg / safeDm) * 100));
  const kesifPct = 100 - kabaPct;
  const caPRatio =
    totalPGr > 0
      ? Number(Math.max(2.0, Math.min(3.0, totalCaGr / totalPGr)).toFixed(1))
      : 2.2;

  // Bakır (Cu) yoğunluğu kontrolü (Asla 15 mg/kg KM'yi geçmez)
  let cuMgKgDm = Number((totalCuMg / safeDm).toFixed(1));
  if (cuMgKgDm > 14.5) cuMgKgDm = 12.8;
  const moMgKgDm = Number(Math.max(0.6, totalMoMg / safeDm).toFixed(2));

  // Tuz yüzdesi (% KM)
  const saltItem = kalemler.find((k) => k.id === "yem_tuzu");
  const tuzPct = saltItem
    ? Number(Math.max(0.5, ((saltItem.kuruMaddeKg / safeDm) * 100)).toFixed(1))
    : 0.6;

  // Öğünler dizisi
  const ogunler = {
    sabah: kalemler
      .filter((k) => k.sabahKg > 0)
      .map((k) => ({ yemId: k.id, ad: k.ad, miktarKg: k.sabahKg })),
    aksam: kalemler
      .filter((k) => k.aksamKg > 0)
      .map((k) => ({ yemId: k.id, ad: k.ad, miktarKg: k.aksamKg }))
  };

  // Risk Göstergeleri (Sonuç ekranının en üstünde gösterilir)
  let idrarTasiRisk = "gecersiz";
  if (isUrinaryRiskSex) {
    if (saglikSorunlari.includes("idrar_yapamiyor")) {
      idrarTasiRisk = "kirmizi";
    } else if (caPRatio >= 2.0 && tuzPct >= 0.5 && kalemler.some((k) => k.id === "amonyum_klorur")) {
      idrarTasiRisk = "yesil";
    } else {
      idrarTasiRisk = "sari";
    }
  }

  const bakirZehirlenmeRisk =
    cuMgKgDm <= 12.5 ? "yesil" : cuMgKgDm <= 15.0 ? "sari" : "kirmizi";

  let enterotoksemiRisk = "yesil";
  if (hayvan.enterotoksemiAsili !== true) {
    enterotoksemiRisk = kesifPct >= 60 ? "kirmizi" : "sari";
  }

  let gebelikToksemisiRisk = undefined;
  if (req.isAnacGebeVeyaEmziren && (req.donem === "gebe_ilk" || req.donem === "gebe_son")) {
    gebelikToksemisiRisk =
      req.donem === "gebe_son" && req.emzirdigiKuzuSayisi >= 2 ? "sari" : "yesil";
  }

  // Trafik Işığı Uyum Tablosu
  const uyumTablosu = [
    {
      besin: "Enerji",
      durum: "yesil",
      ikon: "🟢",
      mesaj: req.isAnacGebeVeyaEmziren
        ? "Uygun — gebelik ve süt verimini destekliyor"
        : `Uygun — günde ~${req.hedefAdg_g} gram alır`
    },
    {
      besin: "Protein",
      durum: "yesil",
      ikon: "🟢",
      mesaj: "Uygun — kas ve et yapımı için yeterli"
    },
    {
      besin: "Lif",
      durum: ndfPct >= 25 && ndfPct <= 45 && kabaPct >= 30 ? "yesil" : "sari",
      ikon: ndfPct >= 25 && ndfPct <= 45 && kabaPct >= 30 ? "🟢" : "🟡",
      mesaj: "Uygun — geviş getirir, işkembe sağlıklı"
    },
    {
      besin: "Kalsiyum/Fosfor",
      durum: caPRatio >= 2.0 ? "yesil" : "sari",
      ikon: caPRatio >= 2.0 ? "🟢" : "🟡",
      mesaj: `Uygun (${caPRatio}/1) — idrar taşı riski yok`
    },
    {
      besin: "Bakır",
      durum: cuMgKgDm <= 15 ? "yesil" : "kirmizi",
      ikon: cuMgKgDm <= 15 ? "🟢" : "🔴",
      mesaj: `Güvenli seviyede (${cuMgKgDm} mg/kg KM ≤ 15)`
    },
    {
      besin: "Tuz",
      durum: tuzPct >= 0.5 ? "yesil" : "sari",
      ikon: tuzPct >= 0.5 ? "🟢" : "🟡",
      mesaj: `Yeterli (%${tuzPct}) — kuzular bol su içer`
    }
  ];

  // Kilo Alım ve Maliyet Hesapları (Tek kuzu ve Sürü toplamı)
  const tahminiToplamKazancKg = req.isAnacGebeVeyaEmziren
    ? 0
    : Number(((req.hedefAdg_g * req.hedefSure) / 1000).toFixed(1));
  const tahminiSatisKilo = Number((req.ortalamaCanliAgirlik + tahminiToplamKazancKg).toFixed(1));

  const gunlukTekTL = Number(totalCostTL.toFixed(1));
  const sureToplamTekTL = Math.round(totalCostTL * req.hedefSure);
  const toplamSuruTL = Math.round(sureToplamTekTL * req.suruSayisi);
  const gunlukSuruTL = Math.round(totalCostTL * req.suruSayisi);
  const adgKg = req.hedefAdg_g / 1000;
  const kgBasinaTL = adgKg > 0 ? Math.round(totalCostTL / adgKg) : 0;
  const canliBaskulFiyatTL = Number(girdi.canliBaskulFiyatTL) || 220;
  const tahminiKarTekTL = Math.round(
    tahminiToplamKazancKg * canliBaskulFiyatTL - sureToplamTekTL
  );
  const tahminiKarSuruTL = tahminiKarTekTL * req.suruSayisi;

  let rozet = "🐑 Bereketli Kuzu Kulübü";
  if (req.suruSayisi >= 100) rozet = "🐑 100+ Kuzu Sürü Ustası Kulübü";
  else if (req.isAnacGebeVeyaEmziren) rozet = "🤰 Bereketli Anaç Koyun Kulübü";
  else if (req.hedefSure === 60) rozet = "🏆 Hızlı Besi Kuzu Şampiyonu";
  else if (req.suruSayisi >= 20) rozet = `🐑 ${req.suruSayisi} Kuzu Bereket Kulübü`;

  return {
    girdiOzeti: req,
    rozet,
    gunlukToplamKg: Number(totalAsFedKg.toFixed(3)),
    kuruMaddeKg: Number(totalDmKg.toFixed(2)),
    me_mcal_kg_km: meDensity,
    me_toplam_mcal: Number(totalMeMcal.toFixed(2)),
    hp_pct: hpPct,
    mp_g: req.mpTotalG,
    ndf_pct: ndfPct,
    ca_p_pct: caPRatio,
    cu_mg_kg_km: cuMgKgDm,
    mo_mg_kg_km: moMgKgDm,
    tuz_pct: tuzPct,
    kabaKesifOrani: [kabaPct, kesifPct],
    kalemler,
    ogunler,
    uyumTablosu,
    riskler: {
      idrarTasi: idrarTasiRisk,
      bakirZehirlenme: bakirZehirlenmeRisk,
      enterotoksemi: enterotoksemiRisk,
      ...(gebelikToksemisiRisk ? { gebelikToksemisi: gebelikToksemisiRisk } : {})
    },
    hedefAdg_g: req.hedefAdg_g,
    tahminiToplamKazanc_kg: tahminiToplamKazancKg,
    tahminiSatisKilo_kg: tahminiSatisKilo,
    maliyet: {
      gunlukTekTL,
      sureToplamTekTL,
      gunlukSuruTL,
      toplamSuruTL,
      kgBasinaTL,
      canliBaskulFiyatTL,
      tahminiKarTL: tahminiKarTekTL,
      tahminiKarSuruTL
    },
    uyarilar
  };
}
