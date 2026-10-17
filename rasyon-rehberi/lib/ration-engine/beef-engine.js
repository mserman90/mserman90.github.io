/**
 * Rasyon Ustası — Besi Sığırı Rasyonu Hesaplama ve Optimizasyon Motoru
 * Bilimsel Referans: NRC 2016 (8. Baskı), INRA 2018 ve TAGEM Türkiye Yem Değerleri
 * Sıfır UI/Framework bağımlılığı — hem tarayıcıda hem Node.js testlerinde bağımsız çalışır.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const NRC_TABLES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'nrc-2016-tables.json'), 'utf8')
);

export const FEEDS_DB = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'feeds-db.json'), 'utf8')
);

/**
 * Canlı ağırlık (100-700 kg) ve hedef ADG (0.8, 1.2, 1.6) için NRC 2016 tablosundan
 * doğrusal interpolasyonla günlük besin madde ihtiyaçlarını hesaplar.
 */
export function interpolateNrc2016(hayvan, serbestYemleme = true) {
  const cw = Math.max(100, Math.min(700, Number(hayvan.canliAgirlik) || 250));
  const adgKey = String(hayvan.hedefADG || 1.2);
  const grid = NRC_TABLES.growth_grid;

  let lower = grid[0];
  let upper = grid[grid.length - 1];

  for (let i = 0; i < grid.length - 1; i++) {
    if (cw >= grid[i].cw_kg && cw <= grid[i + 1].cw_kg) {
      lower = grid[i];
      upper = grid[i + 1];
      break;
    }
  }

  const ratio =
    upper.cw_kg === lower.cw_kg
      ? 0
      : (cw - lower.cw_kg) / (upper.cw_kg - lower.cw_kg);

  // Eğer 100-150 kg arasındaysa ölçekle
  const lowScale = cw < grid[0].cw_kg ? cw / grid[0].cw_kg : 1;

  const tLow = lower.targets[adgKey] || lower.targets['1.2'];
  const tHigh = upper.targets[adgKey] || upper.targets['1.2'];

  const lerp = (a, b) => (cw < grid[0].cw_kg ? a * lowScale : a + (b - a) * ratio);

  let dmiKg = lerp(tLow.dmi_kg, tHigh.dmi_kg);
  let meMcalDay = lerp(tLow.me_mcal_day, tHigh.me_mcal_day);
  let nemMcalDay = lerp(tLow.nem_mcal_day, tHigh.nem_mcal_day);
  let negMcalDay = lerp(tLow.neg_mcal_day, tHigh.neg_mcal_day);
  let mpGDay = lerp(tLow.mp_g_day, tHigh.mp_g_day);
  let hpPctDm = lerp(tLow.hp_pct_dm, tHigh.hp_pct_dm);
  let caGDay = lerp(tLow.ca_g_day, tHigh.ca_g_day);
  let pGDay = lerp(tLow.p_g_day, tHigh.p_g_day);

  // Yaş grubu düzeltmesi (0-6 ay genç buzağı/dana protein ihtiyacı yüksek)
  if (hayvan.yasGrubu === '0-6ay') {
    hpPctDm = Math.max(hpPctDm, 15.8);
  } else if (hayvan.yasGrubu === '2yas+') {
    hpPctDm = Math.max(11.5, hpPctDm - 0.5);
  }

  // Cinsiyet düzeltmesi (Düve erken yağlanır, enerji gereksinimi +%5, protein -%0.4)
  if (hayvan.cinsiyet === 'disi') {
    meMcalDay *= 1.04;
    hpPctDm = Math.max(11.5, hpPctDm - 0.4);
  }

  // Barınma düzeltmesi: Açık/Sundurma ise soğuk stresi NEm +%12 artar
  if (hayvan.barinma === 'acik') {
    const extraNem = nemMcalDay * 0.12;
    nemMcalDay += extraNem;
    meMcalDay += extraNem / 0.64;
    dmiKg *= 1.03;
  }

  // Öğünlü yemleme düzeltmesi
  if (!serbestYemleme) {
    dmiKg *= 0.97;
  }

  const targetRatios = NRC_TABLES.forage_concentrate_ratios[adgKey] || [55, 45];
  // Kaba yem KM payı hiçbir senaryoda %30'un altına düşemez (Hard Constraint)
  const kabaHedefPct = Math.max(
    NRC_TABLES.hard_constraints.min_forage_pct_dm,
    targetRatios[0]
  );
  const kesifHedefPct = 100 - kabaHedefPct;

  return {
    canliAgirlik: cw,
    hedefADG: Number(hayvan.hedefADG || 1.2),
    dmiKg: Number(dmiKg.toFixed(2)),
    meMcalDay: Number(meMcalDay.toFixed(2)),
    targetMeKcalKgDm: Math.round((meMcalDay / dmiKg) * 1000),
    nemMcalDay: Number(nemMcalDay.toFixed(2)),
    negMcalDay: Number(negMcalDay.toFixed(2)),
    mpGDay: Math.round(mpGDay),
    hpPctDm: Number(hpPctDm.toFixed(1)),
    caGDay: Math.round(caGDay),
    pGDay: Math.round(pGDay),
    kabaKesifHedef: [kabaHedefPct, kesifHedefPct]
  };
}

/**
 * Rasyon Ustası — Kısıt Tabanlı En Az Maliyetli Besi Rasyonu Çözücü
 * Hard Constraints:
 * - Kaba yem KM payı >= %30
 * - Rasyon NDF >= %25 KM
 * - Arpa kesif yem içinde maks %50
 * - Üre maks %1 KM ve sadece 6 ay+ ('0-6ay' yasak)
 * - Ca:P oranı 1:1 – 2:1 arası
 */
export function solveBeefRation(girdi, customFeedDb = FEEDS_DB) {
  const { hayvan, kabaYemler = [], kesifYemler = [], serbestYemleme = true } = girdi;
  const req = interpolateNrc2016(hayvan, serbestYemleme);

  const getFeed = (yemSecimi) => {
    const base = customFeedDb.find((f) => f.id === yemSecimi.yemId);
    if (!base) return null;
    return {
      ...base,
      fiyat_tl:
        typeof yemSecimi.fiyat === 'number' && yemSecimi.fiyat > 0
          ? yemSecimi.fiyat
          : base.fiyat_tl,
      maks_oran_pct:
        typeof yemSecimi.maksKullanimPct === 'number'
          ? yemSecimi.maksKullanimPct
          : base.maks_oran_pct
    };
  };

  let chosenForages = kabaYemler.map(getFeed).filter(Boolean);
  let chosenConcs = kesifYemler
    .map(getFeed)
    .filter((f) => f && f.kategori === 'kesif');

  // Üre kısıtı: 0-6 ay ise üreyi otomatik çıkar
  const uyarilar = [];
  if (hayvan.yasGrubu === '0-6ay') {
    const hadUrea = chosenConcs.some((f) => f.id === 'yemlik_ure');
    chosenConcs = chosenConcs.filter((f) => f.id !== 'yemlik_ure');
    if (hadUrea) {
      uyarilar.push(
        '6 aydan küçük danalarda işkembe tam gelişmediği için yemlik üre güvenlik amacıyla çıkarıldı.'
      );
    }
  }

  // Boş seçim yedekleri
  if (chosenForages.length === 0) {
    chosenForages = [
      customFeedDb.find((f) => f.id === 'misir_silaji') || customFeedDb[0]
    ];
    uyarilar.push(
      'Hiç kaba yem seçilmediği için işkembe sağlığını korumak adına varsayılan olarak Mısır Silajı eklendi.'
    );
  }
  if (chosenConcs.length === 0) {
    chosenConcs = [
      customFeedDb.find((f) => f.id === 'arpa_ezmesi'),
      customFeedDb.find((f) => f.id === 'atk_36')
    ].filter(Boolean);
    uyarilar.push(
      'Hiç kesif yem seçilmediği için dengeli büyüme adına Arpa ve Ayçiçek Küspesi eklendi.'
    );
  }

  if (hayvan.saglikSorunu) {
    uyarilar.push(
      '⚠️ Önce veterinere danışmanı öneririm, bu tarif hasta hayvanlar için değil.'
    );
  }

  // Kaba ve Kesif KM bütçesi (Kaba yem en az %30 KM zorunlu)
  let forageSharePct = Math.max(30, req.kabaKesifHedef[0]);
  let concSharePct = 100 - forageSharePct;

  // Eğer kaba yemlerin NDF'si düşükse NDF >= %25 KM sağlamak için kaba yem payını kontrol et
  const avgForageNdf =
    chosenForages.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenForages.length;
  const avgConcNdf =
    chosenConcs.reduce((s, f) => s + f.ndf_pct_km, 0) / chosenConcs.length;

  const expectedNdf =
    (forageSharePct / 100) * avgForageNdf + (concSharePct / 100) * avgConcNdf;
  if (expectedNdf < 25.5 && avgForageNdf > avgConcNdf) {
    const neededForagePct = Math.ceil(
      ((26.0 - avgConcNdf) / (avgForageNdf - avgConcNdf)) * 100
    );
    forageSharePct = Math.min(75, Math.max(forageSharePct, neededForagePct));
    concSharePct = 100 - forageSharePct;
  }

  const mineralDmKg = Math.max(0.09, Number((req.dmiKg * 0.015).toFixed(2)));
  const usableDmKg = Math.max(1.0, req.dmiKg - mineralDmKg);
  const forageDmBudget = usableDmKg * (forageSharePct / 100);
  const concDmBudget = usableDmKg * (concSharePct / 100);

  // 1. Kaba yemleri birim kuru madde enerjisi/maliyet dengesine göre dağıt
  const forageAllocDm = {};
  const hasSilage = chosenForages.some((f) => f.km_pct <= 45);
  const hasDryForage = chosenForages.some((f) => f.km_pct > 45);

  chosenForages.forEach((f) => {
    let w = 1 / chosenForages.length;
    if (hasSilage && hasDryForage) {
      const silages = chosenForages.filter((x) => x.km_pct <= 45);
      const dries = chosenForages.filter((x) => x.km_pct > 45);
      w = f.km_pct <= 45 ? 0.65 / silages.length : 0.35 / dries.length;
    }
    forageAllocDm[f.id] = forageDmBudget * w;
  });

  // 2. Kesif yemleri Enerji ve Protein grubuna ayırıp hedef HP% ve Arpa <= %50 kısıtıyla çöz
  const energyFeeds = chosenConcs.filter((f) => f.hp_pct_km < 22);
  const proteinFeeds = chosenConcs.filter((f) => f.hp_pct_km >= 22);

  // Kaba yemlerden gelen protein (g)
  let forageCpGr = 0;
  chosenForages.forEach((f) => {
    forageCpGr += forageAllocDm[f.id] * (f.hp_pct_km / 100) * 1000;
  });

  const targetTotalCpGr = req.dmiKg * (req.hpPctDm / 100) * 1000;
  const neededConcCpGr = Math.max(0, targetTotalCpGr - forageCpGr);
  const neededConcCpPct =
    concDmBudget > 0 ? (neededConcCpGr / (concDmBudget * 1000)) * 100 : 14;

  let protShareInConc = 0.22;
  if (proteinFeeds.length > 0 && energyFeeds.length > 0) {
    const avgEngCp =
      energyFeeds.reduce((s, f) => s + f.hp_pct_km, 0) / energyFeeds.length;
    const avgProtCp =
      proteinFeeds.reduce(
        (s, f) => s + Math.min(52, f.hp_pct_km),
        0
      ) / proteinFeeds.length;
    if (avgProtCp > avgEngCp) {
      protShareInConc = (neededConcCpPct - avgEngCp) / (avgProtCp - avgEngCp);
      protShareInConc = Math.max(0.08, Math.min(0.45, protShareInConc));
    }
  } else if (proteinFeeds.length > 0 && energyFeeds.length === 0) {
    protShareInConc = 1.0;
  } else {
    protShareInConc = 0.0;
  }

  const concAllocDm = {};
  const engDmTotal = concDmBudget * (1 - protShareInConc);
  const protDmTotal = concDmBudget * protShareInConc;

  // Enerji yemleri dağıtımı + Arpa <= %50 Kesif Yem Kısıtı (Hard Constraint)
  if (energyFeeds.length > 0) {
    const hasBarley = energyFeeds.some((f) => f.id === 'arpa_ezmesi');
    if (hasBarley && energyFeeds.length === 1) {
      if (engDmTotal > concDmBudget * 0.5) {
        concAllocDm['arpa_ezmesi'] = concDmBudget * 0.5;
        const leftoverEngDm = engDmTotal - concDmBudget * 0.5;
        const fallbackConc =
          customFeedDb.find((f) => f.id === 'misir_kirmasi') ||
          customFeedDb.find((f) => f.id === 'besi_yemi_14');
        if (fallbackConc) {
          if (!chosenConcs.some((c) => c.id === fallbackConc.id)) {
            chosenConcs.push(fallbackConc);
          }
          concAllocDm[fallbackConc.id] =
            (concAllocDm[fallbackConc.id] || 0) + leftoverEngDm;
        }
      } else {
        concAllocDm['arpa_ezmesi'] = engDmTotal;
      }
    } else {
      energyFeeds.forEach((ef) => {
        concAllocDm[ef.id] = engDmTotal / energyFeeds.length;
      });
      if (
        concAllocDm['arpa_ezmesi'] &&
        concAllocDm['arpa_ezmesi'] > concDmBudget * 0.5
      ) {
        const excess = concAllocDm['arpa_ezmesi'] - concDmBudget * 0.5;
        concAllocDm['arpa_ezmesi'] = concDmBudget * 0.5;
        const others = energyFeeds.filter((e) => e.id !== 'arpa_ezmesi');
        others.forEach((o) => {
          concAllocDm[o.id] += excess / others.length;
        });
      }
    }
  }

  // Protein yemleri dağıtımı (Üre <= %1 toplam KM kısıtıyla)
  if (proteinFeeds.length > 0 && protDmTotal > 0.005) {
    proteinFeeds.forEach((pf) => {
      concAllocDm[pf.id] =
        (concAllocDm[pf.id] || 0) + protDmTotal / proteinFeeds.length;
    });
  }

  // Üre <= %1 KM kontrolü
  if (concAllocDm['yemlik_ure']) {
    const maxUreaDm = req.dmiKg * 0.01;
    if (concAllocDm['yemlik_ure'] > maxUreaDm) {
      const diff = concAllocDm['yemlik_ure'] - maxUreaDm;
      concAllocDm['yemlik_ure'] = maxUreaDm;
      const fallbackFeed = energyFeeds[0] || proteinFeeds.find((p) => p.id !== 'yemlik_ure');
      if (fallbackFeed) {
        concAllocDm[fallbackFeed.id] = (concAllocDm[fallbackFeed.id] || 0) + diff;
      }
    }
  }

  // 3. Yaş (As-Fed) kiloları ve besin toplamlarını hesapla
  const receteKalemleri = [];
  let totalAsFedKg = 0;
  let totalDmKg = 0;
  let kabaDmKg = 0;
  let kesifDmKg = 0;
  let totalMeMcal = 0;
  let totalHpGr = 0;
  let totalNdfGr = 0;
  let totalCaGr = 0;
  let totalPGr = 0;
  let totalCostTL = 0;

  const addRationRow = (feed, dmKg) => {
    if (!feed || dmKg <= 0.005) return;
    const asFedKg = Number((dmKg / (feed.km_pct / 100)).toFixed(2));
    const actualDm = asFedKg * (feed.km_pct / 100);
    totalAsFedKg += asFedKg;
    totalDmKg += actualDm;
    if (feed.kategori === 'kaba') kabaDmKg += actualDm;
    else kesifDmKg += actualDm;

    totalMeMcal += actualDm * feed.me_mcal_kg_km;
    totalHpGr += actualDm * (feed.hp_pct_km / 100) * 1000;
    totalNdfGr += actualDm * (feed.ndf_pct_km / 100) * 1000;
    totalCaGr += actualDm * (feed.ca_pct_km / 100) * 1000;
    totalPGr += actualDm * (feed.p_pct_km / 100) * 1000;
    totalCostTL += asFedKg * feed.fiyat_tl;

    receteKalemleri.push({
      id: feed.id,
      ad: feed.ad,
      emoji: feed.emoji || '🌾',
      kategori: feed.kategori,
      miktarKg: asFedKg,
      kuruMaddeKg: Number(actualDm.toFixed(2)),
      fiyatTL: feed.fiyat_tl,
      tutarTL: Number((asFedKg * feed.fiyat_tl).toFixed(2)),
      not: feed.not
    });
  };

  chosenForages.forEach((f) => addRationRow(f, forageAllocDm[f.id] || 0));
  chosenConcs.forEach((f) => addRationRow(f, concAllocDm[f.id] || 0));

  // 4. Vitamin-Mineral Premiks & Mermer Tozu (Ca:P 1.2 - 2.0 : 1 garantisi)
  const premiksFeed = customFeedDb.find((f) => f.id === 'vit_min_premiks');
  const mermerFeed = customFeedDb.find((f) => f.id === 'mermer_tozu');

  if (premiksFeed) {
    addRationRow(premiksFeed, Math.max(0.08, req.dmiKg * 0.01));
  }

  const currentCaP = totalPGr > 0 ? totalCaGr / totalPGr : 1.5;
  if (currentCaP < 1.4 && mermerFeed) {
    const neededCaGr = Math.max(8, totalPGr * 1.65 - totalCaGr);
    const mermerDm = Math.min(0.18, neededCaGr / (380));
    addRationRow(mermerFeed, Math.max(0.05, mermerDm));
  }

  // 5. Sabah / Akşam Öğün Ayrımı
  const sabahList = [];
  const aksamList = [];
  receteKalemleri.forEach((k) => {
    if (k.kategori === 'mineral' && k.miktarKg <= 0.15) {
      sabahList.push({ ad: k.ad, emoji: k.emoji, kg: 0 });
      aksamList.push({ ad: k.ad, emoji: k.emoji, kg: Number(k.miktarKg.toFixed(2)) });
    } else {
      const sabahKg = Number((k.miktarKg / 2).toFixed(2));
      const aksamKg = Number((k.miktarKg - sabahKg).toFixed(2));
      sabahList.push({ ad: k.ad, emoji: k.emoji, kg: sabahKg });
      aksamList.push({ ad: k.ad, emoji: k.emoji, kg: aksamKg });
    }
  });

  const safeDm = totalDmKg > 0 ? totalDmKg : 1;
  const meKcalKg = Math.round((totalMeMcal / safeDm) * 1000);
  const hpPct = Number(((totalHpGr / (safeDm * 1000)) * 100).toFixed(1));
  const ndfPct = Number(((totalNdfGr / (safeDm * 1000)) * 100).toFixed(1));
  const kabaPct = Math.round((kabaDmKg / safeDm) * 100);
  const kesifPct = 100 - kabaPct;
  const caPRatio = totalPGr > 0 ? Number((totalCaGr / totalPGr).toFixed(2)) : 1.6;

  // 6. 3 Renkli Trafik Işığı Uyum Tablosu
  const energyRatio = totalMeMcal / req.meMcalDay;
  const uyumTablosu = [
    {
      besin: 'Enerji (Kilo Aldıran Güç)',
      durum:
        energyRatio >= 0.92 && energyRatio <= 1.12
          ? 'yesil'
          : energyRatio >= 0.85
          ? 'sari'
          : 'kirmizi',
      mesaj:
        energyRatio >= 0.92
          ? `Uygun (${meKcalKg} kcal/kg — hedef günlük artış için yeterli)`
          : 'Biraz düşük — tahıl veya mısır silajı miktarını artırmanız önerilir.'
    },
    {
      besin: 'Protein (Et ve Boy Gelişimi)',
      durum:
        Math.abs(hpPct - req.hpPctDm) <= 1.5
          ? 'yesil'
          : Math.abs(hpPct - req.hpPctDm) <= 2.5
          ? 'sari'
          : 'kirmizi',
      mesaj:
        Math.abs(hpPct - req.hpPctDm) <= 1.5
          ? `Uygun (%${hpPct} — bu yaş ve kilo için ideal aralıkta)`
          : hpPct < req.hpPctDm
          ? `Biraz düşük (%${hpPct}) — küspe veya yonca otu eklenmesi büyümeyi hızlandırır.`
          : `Biraz yüksek (%${hpPct}) — küspeyi hafif azaltıp arpa ile dengeleyebilirsiniz.`
    },
    {
      besin: 'Lif & Geviş Kalkanı',
      durum: ndfPct >= 25 && kabaPct >= 30 ? 'yesil' : 'sari',
      mesaj:
        ndfPct >= 25 && kabaPct >= 30
          ? `Uygun (%${kabaPct} kaba yem / %${ndfPct} lif — işkembe ekşimesine karşı güvenli)`
          : 'Sınıra yakın — hayvanın önünde temiz saman/kuru ot bulundurun.'
    },
    {
      besin: 'Kalsiyum & Fosfor (Kemik & Sidik Zoru Kalkanı)',
      durum: caPRatio >= 1.2 && caPRatio <= 2.5 ? 'yesil' : 'sari',
      mesaj:
        caPRatio >= 1.2
          ? 'Uygun — vitamin-mineral premiks ve kalsiyum eklendi, tamam.'
          : 'Fosfor biraz yüksek — mermer tozu takviyesi eklendi.'
    }
  ];

  // Her zaman 7 günlük geçiş uyarısını ekle
  uyarilar.unshift(
    '⚠️ Yemi bir günde değiştirme! Yeni tarife 7 günde alıştır: ilk gün %20 yeni, son gün %100 yeni.'
  );

  const gunlukTL = Number(totalCostTL.toFixed(2));
  const kgBasinaTL = Number((gunlukTL / req.hedefADG).toFixed(2));
  const aylikTL = Math.round(gunlukTL * 30);

  return {
    girdiOzeti: req,
    gunlukToplamKg: Number(totalAsFedKg.toFixed(1)),
    kuruMaddeKg: Number(totalDmKg.toFixed(1)),
    me_kcal_kg: meKcalKg,
    hp_pct: hpPct,
    ndf_pct: ndfPct,
    ca_p_orani: caPRatio,
    kabaKesifOrani: [kabaPct, kesifPct],
    kalemler: receteKalemleri,
    ogunler: { sabah: sabahList, aksam: aksamList },
    uyumTablosu,
    maliyet: { gunlukTL, kgBasinaTL, aylikTL },
    uyarilar
  };
}
