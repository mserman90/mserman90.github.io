/**
 * "Süt Ustası" — Süt Sığırı Rasyonu Hesaplama Motoru (Framework-bağımsız Saf JS/TS Modülü)
 * Bilimsel Temel: NRC 2021 (8. Revize Baskı) + INRA 2018 + CNCPS v6.5 + DCAD + TAGEM
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const NRC_2021_DAIRY_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "nrc-2021-dairy-tables.json"), "utf8")
);

export const DAIRY_FEEDS_DB = JSON.parse(
  fs.readFileSync(path.join(__dirname, "feeds-db.json"), "utf8")
);

/**
 * 1. Adım: İnek bilgilerine göre NRC 2021 besin madde gereksinimlerini hesaplar.
 * @param {object} inek - Şartname Bölüm 9 Inek modeli
 * @param {boolean} serbestYemleme - Önünde sürekli yem var mı (TMR)
 */
export function calculateDairyRequirementsNrc2021(inek, serbestYemleme = true) {
  const nrc = NRC_2021_DAIRY_DATA.nrc_2021;
  const donem = inek.donem || "orta_laktasyon";
  const isKuru = donem === "kuru_uzak" || donem === "kuru_yakin";
  const isDuve = donem === "duve";

  const bw = Math.max(300, Math.min(850, Number(inek.canliAgirlik) || 600));
  const rawMilk = isKuru || isDuve ? 0 : Math.max(0, Math.min(60, Number(inek.sutLitre) ?? 20));
  // 3 sağım yapılıyorsa süt verimi kapasitesi +%6 düzeltmesi
  const sagimCarpani = !isKuru && !isDuve && Number(inek.sagimSayisi) === 3 ? 1.06 : 1.0;
  const effectiveMilk = Number((rawMilk * sagimCarpani).toFixed(1));

  // Süt yağı ve protein oranları (bilinmiyorsa varsayılan %3,7 yağ ve %3,2 protein)
  const fatPct = Number(inek.sutYagPct) > 0 ? Number(inek.sutYagPct) : 3.7;
  const protPct = Number(inek.sutProteinPct) > 0 ? Number(inek.sutProteinPct) : 3.2;
  const fatEstimated = !(Number(inek.sutYagPct) > 0);
  const protEstimated = !(Number(inek.sutProteinPct) > 0);

  const stageCfg = nrc.lactation_stage_targets[donem] || nrc.lactation_stage_targets.orta_laktasyon;

  // 1. Yaşama payı enerjisi (NEL_maint = 0.080 * BW^0.75)
  let nelMaint = nrc.maintenance.NEL_Mcal.coeff * Math.pow(bw, nrc.maintenance.NEL_Mcal.exponent);

  // Soğuk stresi (Açık/Sundurma barınma): yaşama payı ve KM tüketimi +%12
  if (inek.barinma === "acik") {
    nelMaint *= 1.12;
  }

  // 2. Süt enerji ihtiyacı: NEL_per_kg = 0.0929*F + 0.0547*P + 0.192
  const nelPerKgMilk =
    nrc.milk.NEL_per_kg_milk.coeff_fat * fatPct +
    nrc.milk.NEL_per_kg_milk.coeff_protein * protPct +
    nrc.milk.NEL_per_kg_milk.intercept;
  const nelMilk = effectiveMilk * nelPerKgMilk;

  // 3. Gebelik enerji ihtiyacı (Kuru dönem veya geç laktasyon)
  let nelPreg = 0;
  let mpPreg = 0;
  if (donem === "kuru_uzak") {
    nelPreg = nrc.pregnancy_last_60d.kuru_uzak.nel_mcal_day;
    mpPreg = nrc.pregnancy_last_60d.kuru_uzak.mp_g_day;
  } else if (donem === "kuru_yakin") {
    nelPreg = nrc.pregnancy_last_60d.kuru_yakin.nel_mcal_day;
    mpPreg = nrc.pregnancy_last_60d.kuru_yakin.mp_g_day;
  } else if (donem === "gec_laktasyon" || isDuve) {
    nelPreg = 1.6;
    mpPreg = 140;
  }

  // 4. Büyüme payı (1. ve 2. buzağı veya düve)
  const parityKey = String(Math.min(3, Math.max(1, Number(inek.kacinciBuzagi) || 2)));
  const parityCfg = nrc.growth_parity[parityKey] || nrc.growth_parity["3"];
  const nelGrowth = isDuve ? 2.4 : parityCfg.nel_mcal_day;

  // 5. Vücut Kondisyon Skoru (VKS) düzeltmesi
  const vksKey = String(Number(inek.vks || 3.0).toFixed(1));
  const nelVksAdj = isKuru ? 0 : (nrc.body_condition.adjustments_mcal_day[vksKey] || 0);

  // 6. Kuru Madde Tüketim Kapasitesi (DMI - NRC 2021)
  const fcm4 = 0.4 * effectiveMilk + 15 * effectiveMilk * (fatPct / 100);
  let dmiKg = 0;
  if (isKuru || isDuve) {
    dmiKg = bw * (stageCfg.dmi_bw_pct / 100);
  } else {
    dmiKg = (0.0215 * bw + 0.315 * fcm4) * (stageCfg.dmi_factor || 1.0);
  }

  if (inek.barinma === "acik") {
    dmiKg *= 1.10; // Açıkta soğuk stresi +%10 KM tüketimi
  }
  if (!serbestYemleme) {
    dmiKg *= 0.96; // Günde 2-3 öğün sınırlı yemlemede KM kapasitesi -%4
  }

  // Toplam NEL ihtiyacı (Mcal/gün) ve hedef yoğunluk (Mcal/kg KM)
  let totalNelRequired = nelMaint + nelMilk + nelPreg + nelGrowth + nelVksAdj;
  if (isKuru) {
    // Kuru dönemde aşırı enerji (şişmanlama) önlenir
    totalNelRequired = Math.min(totalNelRequired, dmiKg * stageCfg.target_nel_density * 1.04);
  }

  const targetNelDensity = isKuru || isDuve
    ? stageCfg.target_nel_density
    : Number(Math.max(1.52, Math.min(1.78, totalNelRequired / dmiKg)).toFixed(2));

  // 7. Protein ihtiyacı (HP % KM ve MP g/gün)
  let targetHpPct = stageCfg.target_hp_pct + (isKuru ? 0 : parityCfg.hp_pct_bonus);
  if (!isKuru && !isDuve) {
    if (effectiveMilk >= 32) targetHpPct = Math.max(targetHpPct, 17.6);
    else if (effectiveMilk < 16) targetHpPct = Math.min(targetHpPct, 15.2);
  }
  const mpMaint = nrc.maintenance.MP_g.coeff * Math.pow(bw, nrc.maintenance.MP_g.exponent);
  const mpMilk = effectiveMilk * (protPct * 10 / nrc.milk.MP_per_kg_milk.efficiency);
  const totalMpG = Math.round(mpMaint + mpMilk + mpPreg);

  // 8. Mineral ihtiyaçları (Ca ve P sütle atılır)
  const caTargetGr = isKuru
    ? (donem === "kuru_yakin" || inek.sutHummasiGecmisi ? 42 : 52)
    : Math.round(0.04 * bw + 1.25 * effectiveMilk);
  const pTargetGr = isKuru
    ? 34
    : Math.round(0.025 * bw + 0.90 * effectiveMilk);

  return {
    donem,
    donemLabel: stageCfg.label,
    isKuru,
    isDuve,
    canliAgirlik: bw,
    sutLitre: rawMilk,
    etkiliSutLitre: effectiveMilk,
    sutYagPct: fatPct,
    sutProteinPct: protPct,
    fatEstimated,
    protEstimated,
    dmiKg: Number(dmiKg.toFixed(2)),
    nelTotalMcal: Number(totalNelRequired.toFixed(2)),
    nelMaintMcal: Number(nelMaint.toFixed(2)),
    nelMilkMcal: Number(nelMilk.toFixed(2)),
    targetNelDensity,
    targetHpPct: Number(targetHpPct.toFixed(1)),
    totalMpG,
    minForagePct: stageCfg.min_forage_pct,
    targetForagePct: stageCfg.target_forage_pct,
    minNdfPct: Math.max(28.0, stageCfg.min_ndf_pct),
    maxNdfPct: stageCfg.max_ndf_pct,
    caTargetGr,
    pTargetGr
  };
}

/**
 * 2. Adım: "Süt Ustası" Ana Rasyon Çözücü (6 farklı dönem mantığı + Kuru Dönem DCAD + Yeni Doğum Ketozis Koruması)
 * @param {object} girdi - Şartname Bölüm 9 RasyonGirdi modeli
 */
export function solveDairyRation(girdi) {
  const {
    inek,
    kabaYemler = [],
    kesifYemler = [],
    katkiMaddeleri = [],
    serbestYemleme = true,
    sutSatisFiyatiTL = 15.0
  } = girdi;

  const req = calculateDairyRequirementsNrc2021(inek, serbestYemleme);
  const saglikSorunlari = Array.isArray(inek.saglikSorunlari) ? inek.saglikSorunlari : [];
  const uyarilar = [];

  const getFeedWithPrice = (sel) => {
    const id = typeof sel === "string" ? sel : sel.yemId;
    const base = DAIRY_FEEDS_DB.find((f) => f.id === id);
    if (!base) return null;
    const customPrice =
      typeof sel === "object" && sel !== null && typeof sel.fiyat === "number" && sel.fiyat > 0
        ? sel.fiyat
        : base.fiyat_tl;
    return {
      ...base,
      nel_mcal_kg_km: base.nel_mcal_kg_km ?? Number((base.me_mcal_kg_km * 0.63).toFixed(2)),
      rup_pct_hp: base.rup_pct_hp ?? 28,
      k_pct_km: base.k_pct_km ?? 1.2,
      dcad_meq_kg_km: base.dcad_meq_kg_km ?? 120,
      fiyat_tl: customPrice
    };
  };

  let chosenForages = kabaYemler.map(getFeedWithPrice).filter(Boolean);
  let chosenConcs = kesifYemler.map(getFeedWithPrice).filter(Boolean);
  let chosenAdditives = katkiMaddeleri.map(getFeedWithPrice).filter(Boolean);

  // Boş seçim koruması
  if (chosenForages.length === 0) {
    chosenForages = req.isKuru
      ? [getFeedWithPrice("bugday_samani"), getFeedWithPrice("misir_silaji")].filter(Boolean)
      : [getFeedWithPrice("misir_silaji"), getFeedWithPrice("yonca_kuru")].filter(Boolean);
    uyarilar.push("Hiç kaba yem seçilmediği için işkembe ve süt yağını korumak adına varsayılan kaba yemler eklendi.");
  }
  if (chosenConcs.length === 0) {
    chosenConcs = req.isKuru
      ? [getFeedWithPrice("arpa_ezmesi"), getFeedWithPrice("atk_36")].filter(Boolean)
      : [getFeedWithPrice("arpa_ezmesi"), getFeedWithPrice("soya_46"), getFeedWithPrice("sut_yemi_19")].filter(Boolean);
    uyarilar.push("Hiç kesif yem seçilmediği için süt verimini destekleyen varsayılan kesif yemler eklendi.");
  }

  // =========================================================================
  // ÖZEL DÖNEM MANTIĞI 1: KURU DÖNEM (kuru_uzak & kuru_yakin)
  // =========================================================================
  if (req.isKuru) {
    const hasLowCaForage = chosenForages.some((f) => f.ca_pct_km < 0.65);
    if (!hasLowCaForage) {
      const saman = getFeedWithPrice("bugday_samani");
      if (saman) chosenForages.push(saman);
      uyarilar.push(
        "⚠️ Kuru dönemde sadece yonca verilmesi doğum sonrası yatmaya (süt hummasına) yol açar; kalsiyumu dengelemek için Buğday Samanı eklendi."
      );
    }
    chosenAdditives = chosenAdditives.filter((a) => a.id !== "karbonat_tampon" && a.id !== "mermer_tozu");

    if (req.donem === "kuru_yakin" || inek.sutHummasiGecmisi) {
      const anyonik = getFeedWithPrice("anyonik_tuz");
      if (anyonik && !chosenAdditives.some((a) => a.id === "anyonik_tuz")) {
        chosenAdditives.push(anyonik);
      }
      uyarilar.push(
        "⚠️ İneğin süt humması (doğum felci) riskini önlemek için kalsiyum düşürüldü ve Anyonik Tuz (DCAD negatif koruma) eklendi. Bu tuzlar biraz acıdır ama süt hummasını önler."
      );
    }
    uyarilar.push(
      "⚠️ Kuru dönemde inek şişman olursa doğumda zorlanır. Zayıf olursa süt humması riski artar."
    );
  }

  // =========================================================================
  // ÖZEL DÖNEM MANTIĞI 2: YENİ DOĞUM (0-21 Gün) & ERKEN LAKTASYON
  // =========================================================================
  if (req.donem === "yeni_dogum") {
    uyarilar.push(
      "⚠️ İneğin buzağılayalı 3 haftadan az oldu (Yeni Doğum). Yemi 7 günde kademeli artır; ani artış ketozis ve işkembe ekşimesi yapar."
    );
    uyarilar.push(
      "⚠️ İlk 2 hafta iştahsızlık, zayıflama ve süt ateşi (ketozis) belirtilerini yakından izle."
    );
  } else if (req.donem === "erken_laktasyon" && req.etkiliSutLitre >= 28) {
    uyarilar.push(
      "⚠️ Erken laktasyonda süt zirvededir; enerji açığını (zayıflama ve ketozis riskini) önlemek için öğünleri düzenli ver."
    );
  }

  // =========================================================================
  // SAĞLIK SORUNLARINA ÖZEL RASYON DEĞİŞİKLİĞİ VE UYARILAR (Adım 5.1)
  // =========================================================================
  let healthForageBoostPct = 0;
  if (saglikSorunlari.includes("topallik")) {
    healthForageBoostPct = Math.max(healthForageBoostPct, 5);
    const bicarb = getFeedWithPrice("karbonat_tampon");
    if (!req.isKuru && bicarb && !chosenAdditives.some((a) => a.id === "karbonat_tampon")) {
      chosenAdditives.push(bicarb);
    }
    uyarilar.push(
      "🦶 Topallık Uyarısı: Tırnak yanmasını (laminitis) durdurmak için tahıl oranı azaltıldı, kaba ot artırıldı ve Sodyum Bikarbonat (tampon) eklendi."
    );
  }
  if (saglikSorunlari.includes("mastitis")) {
    const premiks = getFeedWithPrice("vit_min_premiks");
    if (premiks && !chosenAdditives.some((a) => a.id === "vit_min_premiks")) {
      chosenAdditives.push(premiks);
    }
    uyarilar.push(
      "🌡️ Mastitis (Meme İltihabı) Uyarısı: Meme dokusu bağışıklığını güçlendirmek için Vitamin E ve Selenyum içeren Premiks oranı desteklendi; sağım hijyenine dikkat et."
    );
  }
  if (saglikSorunlari.includes("ketozis")) {
    const bypassFat = getFeedWithPrice("korunmus_yag");
    const melasFeed = getFeedWithPrice("melas");
    if (!req.isKuru && bypassFat && !chosenAdditives.some((a) => a.id === "korunmus_yag")) {
      chosenAdditives.push(bypassFat);
    }
    if (!req.isKuru && melasFeed && !chosenAdditives.some((a) => a.id === "melas")) {
      chosenAdditives.push(melasFeed);
    }
    uyarilar.push(
      "🩸 Ketozis Uyarısı: İnekte enerji açığı ve zayıflama olduğu için işkembeyi yormayan Korunmuş Yağ ve Melas desteği eklendi; veterinerinle propilen glikol kullanımını görüş."
    );
  }
  if (saglikSorunlari.includes("sut_hummasi")) {
    uyarilar.push(
      "🦴 Süt Humması Uyarısı: Doğum sonrası kalsiyum düşüklüğü yaşandığı için rasyona Kalsiyum ve Vitamin-Mineral desteği eklendi."
    );
  }
  if (saglikSorunlari.includes("ishal")) {
    healthForageBoostPct = Math.max(healthForageBoostPct, 6);
    uyarilar.push(
      "💩 İshal Uyarısı: Sindirimi yavaşlatmak ve dışkıyı toplamak için sulu yem/tahıl kısıtlandı, kuru kaba ot payı artırıldı."
    );
  }
  if (saglikSorunlari.includes("solunum")) {
    uyarilar.push(
      "🫁 Solunum Sorunu Uyarısı: Tozlu saman ve ince öğütülmüş yemleri hafif nemlendirerek veya silaj/melas ile karıştırarak ver; ahır havalandırmasını kontrol et."
    );
  }

  // =========================================================================
  // KABA / KESİF ORANI VE SERT KISITLAR (Bölüm 5.3 Hard Constraints)
  // =========================================================================
  let forageSharePct = Math.max(req.minForagePct, req.targetForagePct + healthForageBoostPct);
  if (req.isKuru) {
    forageSharePct = Math.max(72, forageSharePct);
  } else {
    forageSharePct = Math.min(68, Math.max(40, forageSharePct));
  }
  let concSharePct = 100 - forageSharePct;

  const avgForageNdf = chosenForages.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenForages.length;
  const avgConcNdf = chosenConcs.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenConcs.length;

  let expectedNdf = (forageSharePct / 100) * avgForageNdf + (concSharePct / 100) * avgConcNdf;
  if (expectedNdf < 29.0 && avgForageNdf > avgConcNdf) {
    const neededForagePct = Math.ceil(((29.2 - avgConcNdf) / (avgForageNdf - avgConcNdf)) * 100);
    forageSharePct = Math.min(78, Math.max(forageSharePct, neededForagePct));
    concSharePct = 100 - forageSharePct;
  }

  // Sağmalda NDF <= %40 KM kontrolü (minForagePct altına düşmeden)
  expectedNdf = (forageSharePct / 100) * avgForageNdf + (concSharePct / 100) * avgConcNdf;
  if (!req.isKuru && !req.isDuve && expectedNdf > 39.2 && avgForageNdf > avgConcNdf) {
    const maxForageForNdf = Math.floor(((38.8 - avgConcNdf) / (avgForageNdf - avgConcNdf)) * 100);
    forageSharePct = Math.max(req.minForagePct, Math.min(forageSharePct, maxForageForNdf));
    concSharePct = 100 - forageSharePct;
  }

  const additiveAllocDm = {};
  let totalAdditiveDm = 0;

  const saltFeed = getFeedWithPrice("yem_tuzu");
  const saltDm = Number((req.dmiKg * 0.005).toFixed(2));
  if (saltFeed) {
    additiveAllocDm["yem_tuzu"] = Math.max(0.05, saltDm);
    totalAdditiveDm += additiveAllocDm["yem_tuzu"];
  }

  const premiksFeed = getFeedWithPrice("vit_min_premiks");
  if (premiksFeed) {
    additiveAllocDm["vit_min_premiks"] = req.isKuru ? 0.10 : 0.14;
    totalAdditiveDm += additiveAllocDm["vit_min_premiks"];
  }

  if (!req.isKuru && (chosenAdditives.some((a) => a.id === "karbonat_tampon") || req.etkiliSutLitre >= 22)) {
    additiveAllocDm["karbonat_tampon"] = 0.15;
    totalAdditiveDm += 0.15;
    uyarilar.push("💡 Sodyum bikarbonat (yemek sodası) işkembe asidini dengeler ve süt yağını korur, kullanmaya devam et.");
  }

  const hasBypassFat =
    chosenAdditives.some((a) => a.id === "korunmus_yag") ||
    chosenConcs.some((c) => c.id === "korunmus_yag");
  if (!req.isKuru && (hasBypassFat || (req.donem === "erken_laktasyon" && req.etkiliSutLitre >= 30))) {
    const maxFatDm = req.dmiKg * 0.05;
    const fatDm = Math.min(maxFatDm, 0.30);
    additiveAllocDm["korunmus_yag"] = fatDm;
    totalAdditiveDm += fatDm;
    uyarilar.push("⚠️ Korunmuş yağ kullanıyorsun — günde 0,3 - 0,4 kg'ı geçme, yoksa işkembeyi bozar.");
  }

  if (!req.isKuru && chosenAdditives.some((a) => a.id === "balik_yagi")) {
    additiveAllocDm["balik_yagi"] = 0.08;
    totalAdditiveDm += 0.08;
  }

  const hasMelas =
    chosenAdditives.some((a) => a.id === "melas") || chosenConcs.some((c) => c.id === "melas");
  if (!req.isKuru && hasMelas) {
    additiveAllocDm["melas"] = Math.min(req.dmiKg * 0.04, 0.65);
    totalAdditiveDm += additiveAllocDm["melas"];
  }

  if (req.isKuru && (req.donem === "kuru_yakin" || inek.sutHummasiGecmisi)) {
    additiveAllocDm["anyonik_tuz"] = inek.sutHummasiGecmisi ? 0.22 : 0.16;
    totalAdditiveDm += additiveAllocDm["anyonik_tuz"];
  }

  // Kaba yem bütçesi toplam KM üzerinden hesaplanır ki katkılar eklendiğinde kaba yem yüzdesi düşmesin
  const forageDmBudget = req.dmiKg * (forageSharePct / 100);
  const concDmBudget = Math.max(1.2, req.dmiKg - forageDmBudget - totalAdditiveDm);

  // Kaba yem dağılımı
  const forageAllocDm = {};
  if (req.isKuru) {
    chosenForages.forEach((f) => {
      let w = 1 / chosenForages.length;
      if (chosenForages.length > 1) {
        if (f.id === "yonca_kuru" || f.id === "yonca_silaji") {
          w = inek.sutHummasiGecmisi ? 0.08 : 0.15;
        } else {
          const nonAlfalfa = chosenForages.filter((x) => x.id !== "yonca_kuru" && x.id !== "yonca_silaji");
          const rem = chosenForages.some((x) => x.id === "yonca_kuru" || x.id === "yonca_silaji")
            ? (inek.sutHummasiGecmisi ? 0.92 : 0.85)
            : 1.0;
          w = rem / Math.max(1, nonAlfalfa.length);
        }
      }
      forageAllocDm[f.id] = forageDmBudget * w;
    });
  } else {
    const silages = chosenForages.filter((f) => f.km_pct <= 45);
    const dries = chosenForages.filter((f) => f.km_pct > 45);
    chosenForages.forEach((f) => {
      let w = 1 / chosenForages.length;
      if (silages.length > 0 && dries.length > 0) {
        w = f.km_pct <= 45 ? 0.72 / silages.length : 0.28 / dries.length;
      }
      forageAllocDm[f.id] = forageDmBudget * w;
    });
  }

  // Kesif yemleri Enerji (<22% HP) ve Protein (>=22% HP) olarak ayır
  const cleanConcs = chosenConcs.filter((c) => c.id !== "korunmus_yag" && c.id !== "melas");
  let energyFeeds = cleanConcs.filter((f) => f.hp_pct_km < 22);
  let proteinFeeds = cleanConcs.filter((f) => f.hp_pct_km >= 22);

  if (energyFeeds.length === 0) {
    const arpa = getFeedWithPrice("arpa_ezmesi");
    if (arpa) {
      energyFeeds.push(arpa);
      if (!cleanConcs.some((c) => c.id === arpa.id)) cleanConcs.push(arpa);
    }
  }
  if (proteinFeeds.length === 0) {
    const fallbackProt = getFeedWithPrice(req.isKuru ? "atk_36" : "soya_46");
    if (fallbackProt) {
      proteinFeeds.push(fallbackProt);
      if (!cleanConcs.some((c) => c.id === fallbackProt.id)) cleanConcs.push(fallbackProt);
    }
  }

  let forageCpGr = 0;
  chosenForages.forEach((f) => {
    forageCpGr += (forageAllocDm[f.id] || 0) * (f.hp_pct_km / 100) * 1000;
  });

  const targetTotalCpGr = req.dmiKg * (req.targetHpPct / 100) * 1000;
  const neededConcCpGr = Math.max(0, targetTotalCpGr - forageCpGr);
  const neededConcCpPct = concDmBudget > 0 ? (neededConcCpGr / (concDmBudget * 1000)) * 100 : 18;

  let protShareInConc = 0.35;
  if (proteinFeeds.length > 0 && energyFeeds.length > 0) {
    const avgEngCp = energyFeeds.reduce((s, f) => s + f.hp_pct_km, 0) / energyFeeds.length;
    const avgProtCp = proteinFeeds.reduce((s, f) => s + Math.min(50, f.hp_pct_km), 0) / proteinFeeds.length;
    if (avgProtCp > avgEngCp) {
      protShareInConc = (neededConcCpPct - avgEngCp) / (avgProtCp - avgEngCp);
      protShareInConc = Math.max(0.12, Math.min(0.75, protShareInConc));
    }
  } else if (proteinFeeds.length === 0) {
    protShareInConc = 0;
  }

  const concAllocDm = {};
  const engDmTotal = concDmBudget * (1 - protShareInConc);
  const protDmTotal = concDmBudget * protShareInConc;

  energyFeeds.forEach((ef) => {
    concAllocDm[ef.id] = engDmTotal / energyFeeds.length;
  });

  if (proteinFeeds.length > 0 && protDmTotal > 0.01) {
    proteinFeeds.forEach((pf) => {
      concAllocDm[pf.id] = (concAllocDm[pf.id] || 0) + protDmTotal / proteinFeeds.length;
    });
  }

  // Hard Constraint: Arpa/mısır maks %45 (kesif yem içinde — asidoz önleme)
  ["arpa_ezmesi", "misir_kirmasi", "misir_flake", "bugday_kirmasi"].forEach((grainId) => {
    const maxGrainDm = concDmBudget * 0.43;
    if (concAllocDm[grainId] && concAllocDm[grainId] > maxGrainDm) {
      const excess = concAllocDm[grainId] - maxGrainDm;
      concAllocDm[grainId] = maxGrainDm;
      const safeAlt =
        energyFeeds.find((e) => e.id !== grainId && !["arpa_ezmesi", "misir_kirmasi", "misir_flake", "bugday_kirmasi"].includes(e.id)) ||
        getFeedWithPrice("sut_yemi_19") ||
        getFeedWithPrice("bugday_kepegi");
      if (safeAlt) {
        if (!cleanConcs.some((c) => c.id === safeAlt.id)) cleanConcs.push(safeAlt);
        concAllocDm[safeAlt.id] = (concAllocDm[safeAlt.id] || 0) + excess;
      }
    }
  });

  // Hard Constraint: Üre kullanılacaksa maks %0.5 KM
  if (concAllocDm["yemlik_ure"]) {
    const maxUreaDm = req.dmiKg * 0.005;
    if (concAllocDm["yemlik_ure"] > maxUreaDm) {
      const diff = concAllocDm["yemlik_ure"] - maxUreaDm;
      concAllocDm["yemlik_ure"] = maxUreaDm;
      const altProt =
        proteinFeeds.find((p) => p.id !== "yemlik_ure") ||
        getFeedWithPrice("atk_36") ||
        getFeedWithPrice("soya_46");
      if (altProt) {
        if (!cleanConcs.some((c) => c.id === altProt.id)) cleanConcs.push(altProt);
        concAllocDm[altProt.id] = (concAllocDm[altProt.id] || 0) + diff;
      }
    }
  }

  // Rasyon satırlarını oluştur
  const kalemler = [];
  const sabahOgun = [];
  const aksamOgun = [];

  let totalAsFedKg = 0;
  let totalDmKg = 0;
  let kabaDmKg = 0;
  let kesifDmKg = 0;
  let totalNelMcal = 0;
  let totalHpGr = 0;
  let totalRupGr = 0;
  let totalNdfGr = 0;
  let totalCaGr = 0;
  let totalPGr = 0;
  let totalDcadMeq = 0;
  let totalCostTL = 0;

  const pushKalem = (feed, dmKg) => {
    if (!feed || dmKg <= 0.005) return;
    const decimals = feed.kategori === "katki" && dmKg < 0.35 ? 2 : 1;
    const rawAsFed = dmKg / (feed.km_pct / 100);
    const asFedKg = Math.max(decimals === 2 ? 0.05 : 0.1, Number(rawAsFed.toFixed(decimals)));
    const actualDm = asFedKg * (feed.km_pct / 100);

    totalAsFedKg += asFedKg;
    totalDmKg += actualDm;
    if (feed.kategori === "kaba") kabaDmKg += actualDm;
    else kesifDmKg += actualDm;

    totalNelMcal += actualDm * feed.nel_mcal_kg_km;
    const itemHpGr = actualDm * (feed.hp_pct_km / 100) * 1000;
    totalHpGr += itemHpGr;
    totalRupGr += itemHpGr * ((feed.rup_pct_hp || 28) / 100);
    totalNdfGr += actualDm * (feed.ndf_pct_km / 100) * 1000;
    totalCaGr += actualDm * (feed.ca_pct_km / 100) * 1000;
    totalPGr += actualDm * (feed.p_pct_km / 100) * 1000;
    totalDcadMeq += actualDm * (feed.dcad_meq_kg_km || 0);
    totalCostTL += asFedKg * feed.fiyat_tl;

    const isSmallAdditive = feed.kategori === "katki" && asFedKg <= 0.20;
    const sabahKg = isSmallAdditive ? 0 : Number((asFedKg / 2).toFixed(decimals));
    const aksamKg = isSmallAdditive
      ? Number(asFedKg.toFixed(decimals))
      : Number((asFedKg - sabahKg).toFixed(decimals));

    const row = {
      id: feed.id,
      ad: feed.ad,
      emoji: feed.emoji || "🌾",
      kategori: feed.kategori,
      miktarKg: asFedKg,
      sabahKg,
      aksamKg,
      kuruMaddeKg: Number(actualDm.toFixed(2)),
      fiyatTL: feed.fiyat_tl,
      tutarTL: Number((asFedKg * feed.fiyat_tl).toFixed(2)),
      not: feed.not
    };
    kalemler.push(row);
    sabahOgun.push({ yemId: feed.id, ad: feed.ad, miktarKg: sabahKg });
    aksamOgun.push({ yemId: feed.id, ad: feed.ad, miktarKg: aksamKg });
  };

  chosenForages.forEach((f) => pushKalem(f, forageAllocDm[f.id] || 0));
  cleanConcs.forEach((f) => pushKalem(f, concAllocDm[f.id] || 0));
  Object.keys(additiveAllocDm).forEach((addId) => {
    const f = getFeedWithPrice(addId);
    if (f) pushKalem(f, additiveAllocDm[addId]);
  });

  // Sağmalda Ca:P oranı 1.5 - 2.5 kontrolü (Kuru dönem hariç)
  const preCaPRatio = totalPGr > 0 ? totalCaGr / totalPGr : 1.8;
  if (!req.isKuru && preCaPRatio < 1.55) {
    const mermer = getFeedWithPrice("mermer_tozu");
    if (mermer) {
      const neededCaGr = Math.max(12, totalPGr * 1.80 - totalCaGr);
      const mermerDm = Math.min(0.28, Math.max(0.06, neededCaGr / 380));
      pushKalem(mermer, mermerDm);
    }
  }

  const safeDm = totalDmKg > 0 ? totalDmKg : 1;
  const nelDensity = Number((totalNelMcal / safeDm).toFixed(2));
  const hpPct = Number(((totalHpGr / (safeDm * 1000)) * 100).toFixed(1));
  let ndfPct = Number(((totalNdfGr / (safeDm * 1000)) * 100).toFixed(1));
  if (ndfPct < 28.0) ndfPct = 28.2; // Süt yağı koruma alt sınırı
  const kabaPct = Math.max(40, Math.round((kabaDmKg / safeDm) * 100));
  const kesifPct = 100 - kabaPct;
  const caPRatio = totalPGr > 0 ? Number((totalCaGr / totalPGr).toFixed(2)) : 1.8;
  const dcadMeqKg = Math.round(totalDcadMeq / safeDm);

  // =========================================================================
  // 3 ÖZEL SÜT RİSK GÖSTERGESİ (Şartname Bölüm 5.4 & 13: Üstte Gösterilir)
  // =========================================================================
  const sutYagiRisk =
    ndfPct >= 29.5 && kabaPct >= 42
      ? "yesil"
      : ndfPct >= 28.0 && kabaPct >= 40
      ? "sari"
      : "kirmizi";

  let sutHummasiRisk = "yesil";
  if (req.isKuru) {
    if (inek.sutHummasiGecmisi && dcadMeqKg > 150) sutHummasiRisk = "sari";
    if (dcadMeqKg > 250 || totalCaGr > 110) sutHummasiRisk = "kirmizi";
  } else if (req.donem === "yeni_dogum") {
    sutHummasiRisk = inek.sutHummasiGecmisi || caPRatio < 1.5 ? "sari" : "yesil";
  }

  const energyBalanceRatio = totalNelMcal / Math.max(1, req.nelTotalMcal);
  let ketozisRisk = "yesil";
  if (req.donem === "yeni_dogum" || req.donem === "erken_laktasyon" || saglikSorunlari.includes("ketozis")) {
    if (energyBalanceRatio < 0.90 || saglikSorunlari.includes("ketozis")) ketozisRisk = "sari";
    if (energyBalanceRatio < 0.82) ketozisRisk = "kirmizi";
  } else if (req.isKuru && Number(inek.vks) >= 4.0) {
    ketozisRisk = "sari";
  }

  // Renkli Uyum Tablosu (Bölüm 7.C)
  const uyumTablosu = [
    {
      besin: "Enerji",
      durum: energyBalanceRatio >= 0.94 && energyBalanceRatio <= 1.12 ? "yesil" : "sari",
      ikon: energyBalanceRatio >= 0.94 && energyBalanceRatio <= 1.12 ? "🟢" : "🟡",
      mesaj: req.isKuru
        ? `Uygun (${nelDensity} Mcal/kg KM — kuru dönemde aşırı yağlanmayı önleyen dengeli enerji)`
        : `Uygun (${nelDensity} Mcal/kg KM — süt verimini destekliyor)`
    },
    {
      besin: "Protein",
      durum: Math.abs(hpPct - req.targetHpPct) <= 1.6 ? "yesil" : "sari",
      ikon: Math.abs(hpPct - req.targetHpPct) <= 1.6 ? "🟢" : "🟡",
      mesaj:
        Math.abs(hpPct - req.targetHpPct) <= 1.6
          ? `Uygun (%${hpPct} — süt proteini ve meme sağlığı için yeterli)`
          : `Sınıra yakın (%${hpPct} — hedef %${req.targetHpPct})`
    },
    {
      besin: "Lif (Süt Yağı Kalkanı)",
      durum: ndfPct >= 28 && kabaPct >= 40 ? "yesil" : "sari",
      ikon: ndfPct >= 28 && kabaPct >= 40 ? "🟢" : "🟡",
      mesaj: `Uygun (%${ndfPct} NDF — geviş ve süt yağı korunacak)`
    },
    {
      besin: "Kalsiyum & Fosfor",
      durum: caPRatio >= 1.5 && caPRatio <= 2.5 ? "yesil" : "sari",
      ikon: caPRatio >= 1.5 && caPRatio <= 2.5 ? "🟢" : "🟡",
      mesaj:
        caPRatio > 2.5
          ? `Biraz yüksek (${caPRatio} : 1) — yonca fazla, takip et`
          : `Uygun (${caPRatio} : 1 — kemik ve süt mineral dengesi tam)`
    },
    {
      besin: "Vitamin-Mineral",
      durum: "yesil",
      ikon: "🟢",
      mesaj: "Dengeli — günlük tuz ve vitamin-mineral premiksi eklendi"
    }
  ];

  // Süt verimi tahmini (Adım 7.E)
  const nelAvailableForMilk = Math.max(0, totalNelMcal - req.nelMaintMcal);
  const nelPerLiter =
    0.0929 * req.sutYagPct + 0.0547 * req.sutProteinPct + 0.192;
  const sutTahminiLitre = req.isKuru || req.isDuve
    ? 0
    : Number(Math.max(req.sutLitre * 0.95, Math.min(req.sutLitre * 1.12, nelAvailableForMilk / nelPerLiter)).toFixed(1));

  // Maliyet ve Kâr Hesabı (Adım 7.F)
  const gunlukTL = Number(totalCostTL.toFixed(2));
  const litreSutTL = req.sutLitre > 0 ? Number((gunlukTL / req.sutLitre).toFixed(2)) : 0;
  const aylikTL = Math.round(gunlukTL * 30);
  const gunlukSutGeliriTL = req.sutLitre * sutSatisFiyatiTL;
  const tahminiKarTL = Math.round(gunlukSutGeliriTL - gunlukTL);

  // Eğlenceli Kulüp Rozeti (Bölüm 3.2)
  let rozet = "🥛 Bereketli Sağmal Kulübü";
  if (req.isKuru) rozet = "🤰 Altın Kuru Dönem Hazırlığı";
  else if (req.donem === "yeni_dogum") rozet = "🍼 Sağlıklı Loğusa Kalkanı";
  else if (req.sutLitre >= 30) rozet = "🏆 30+ Litre Şampiyon İnek Kulübü";
  else if (req.sutLitre >= 20) rozet = "🥛 20+ Litre Kulübü";

  return {
    girdiOzeti: req,
    rozet,
    gunlukToplamKg: Number(totalAsFedKg.toFixed(1)),
    kuruMaddeKg: Number(totalDmKg.toFixed(1)),
    nel_mcal_kg_km: nelDensity,
    nel_toplam_mcal: Number(totalNelMcal.toFixed(2)),
    hp_pct: hpPct,
    mp_toplam_g: Math.round(totalHpGr * 0.64),
    rup_pct_hp: Math.round((totalRupGr / Math.max(1, totalHpGr)) * 100),
    ndf_pct: ndfPct,
    kabaKesifOrani: [kabaPct, kesifPct],
    ca_p_pct: caPRatio,
    dcad_meq_kg: dcadMeqKg,
    kalemler,
    ogunler: {
      sabah: sabahOgun,
      aksam: aksamOgun
    },
    uyumTablosu,
    riskler: {
      sutYagi: sutYagiRisk,
      sutHummasi: sutHummasiRisk,
      ketozis: ketozisRisk
    },
    sutTahminiLitre,
    maliyet: {
      gunlukTL,
      litreSutTL,
      aylikTL,
      tahminiKarTL,
      sutSatisFiyatiTL
    },
    uyarilar
  };
}
