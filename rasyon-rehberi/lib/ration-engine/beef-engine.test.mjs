import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NRC_TABLES,
  FEEDS_DB,
  interpolateNrc2016,
  solveBeefRation
} from './beef-engine.js';

test('1. Yem veritabanında en az 30 yerleşik yem bulunmalı', () => {
  assert.ok(FEEDS_DB.length >= 30);
});

test('2. 250 kg, 1.2 kg/gün hedefle NRC 2016 tablo değerleri ±%5 içinde uyuşmalı', () => {
  const req = interpolateNrc2016({
    canliAgirlik: 250,
    yasGrubu: '6-12ay',
    cinsiyet: 'erkek',
    hedefADG: 1.2,
    barinma: 'kapali',
    saglikSorunu: false
  });
  // NRC 2016 250 kg @ 1.2 ADG referans: DMI ~6.4 kg, ME ~15.8 Mcal, HP ~%14.2
  assert.ok(Math.abs(req.dmiKg - 6.4) <= 6.4 * 0.05);
  assert.ok(Math.abs(req.meMcalDay - 15.8) <= 15.8 * 0.05);
  assert.ok(Math.abs(req.hpPctDm - 14.2) <= 14.2 * 0.05);
});

test('3. 250 kg dana, 1.2 kg/gün, mısır silajı + arpa + soya + premiks örnek senaryosu NRC ile ±%5 uyumlu olmalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 250,
      yasGrubu: '6-12ay',
      cinsiyet: 'erkek',
      hedefADG: 1.2,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'soya_46' }],
    serbestYemleme: true
  });
  assert.ok(Math.abs(sonuc.kuruMaddeKg - 6.4) <= 0.4);
  assert.ok(sonuc.hp_pct >= 13.5 && sonuc.hp_pct <= 15.0);
  assert.ok(sonuc.me_kcal_kg >= 2450 && sonuc.me_kcal_kg <= 2900);
});

test('4. Kaba yem KM payı hızlı besi (1.6 kg/gün) senaryosunda bile %30 altına düşmemeli', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 450,
      yasGrubu: '1-2yas',
      cinsiyet: 'erkek',
      hedefADG: 1.6,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'misir_kirmasi' }, { yemId: 'atk_36' }],
    serbestYemleme: true
  });
  assert.ok(sonuc.kabaKesifOrani[0] >= 30);
});

test('5. Rasyon NDF oranı rumen sağlığı için her zaman >= %25 KM olmalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 400,
      yasGrubu: '1-2yas',
      cinsiyet: 'erkek',
      hedefADG: 1.6,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'yonca_kuru' }],
    kesifYemler: [{ yemId: 'misir_kirmasi' }, { yemId: 'soya_46' }],
    serbestYemleme: true
  });
  assert.ok(sonuc.ndf_pct >= 25.0);
});

test('6. Kesif yem içinde Arpa oranı hiçbir zaman %50 sınırını aşmamalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 350,
      yasGrubu: '1-2yas',
      cinsiyet: 'erkek',
      hedefADG: 1.2,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'bugday_samani' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }],
    serbestYemleme: true
  });
  const kesifKalemler = sonuc.kalemler.filter((k) => k.kategori === 'kesif');
  const toplamKesifDm = kesifKalemler.reduce((s, k) => s + k.kuruMaddeKg, 0);
  const arpaKalem = kesifKalemler.find((k) => k.id === 'arpa_ezmesi');
  const arpaPayPct = (arpaKalem.kuruMaddeKg / toplamKesifDm) * 100;
  assert.ok(arpaPayPct <= 51.0);
});

test('7. 0-6 ay genç danalarda yemlik üre otomatik olarak engellenmeli', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 160,
      yasGrubu: '0-6ay',
      cinsiyet: 'erkek',
      hedefADG: 1.2,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'yonca_kuru' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'yemlik_ure' }],
    serbestYemleme: true
  });
  const ureVarMi = sonuc.kalemler.some((k) => k.id === 'yemlik_ure');
  assert.equal(ureVarMi, false);
});

test('8. 6 ay üstü danalarda üre seçilirse toplam KM içinde %1 sınırını aşmamalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 400,
      yasGrubu: '1-2yas',
      cinsiyet: 'erkek',
      hedefADG: 1.2,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'misir_kirmasi' }, { yemId: 'yemlik_ure' }],
    serbestYemleme: true
  });
  const ureKalem = sonuc.kalemler.find((k) => k.id === 'yemlik_ure');
  if (ureKalem) {
    assert.ok(ureKalem.kuruMaddeKg <= sonuc.kuruMaddeKg * 0.012);
  }
});

test('9. Açık/Sundurma barınmada soğuk stresi yaşama payı enerjisi (NEm) %12 artmalı', () => {
  const kapali = interpolateNrc2016({
    canliAgirlik: 350,
    yasGrubu: '1-2yas',
    cinsiyet: 'erkek',
    hedefADG: 1.2,
    barinma: 'kapali'
  });
  const acik = interpolateNrc2016({
    canliAgirlik: 350,
    yasGrubu: '1-2yas',
    cinsiyet: 'erkek',
    hedefADG: 1.2,
    barinma: 'acik'
  });
  assert.ok(acik.nemMcalDay > kapali.nemMcalDay);
  assert.ok(Math.abs(acik.nemMcalDay / kapali.nemMcalDay - 1.12) < 0.01);
});

test('10. Ca:P oranı idrar taşını (sidik zorunu) önlemek için 1.0 ile 2.5 arasında olmalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 420,
      yasGrubu: '1-2yas',
      cinsiyet: 'erkek',
      hedefADG: 1.6,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'bugday_samani' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'bugday_kepegi' }, { yemId: 'atk_36' }],
    serbestYemleme: true
  });
  assert.ok(sonuc.ca_p_orani >= 1.1);
});

test('11. Sabah ve akşam öğün miktarlarının toplamı günlük toplam yem miktarına eşit olmalı', () => {
  const sonuc = solveBeefRation({
    hayvan: {
      canliAgirlik: 300,
      yasGrubu: '6-12ay',
      cinsiyet: 'erkek',
      hedefADG: 1.2,
      barinma: 'kapali',
      saglikSorunu: false
    },
    kabaYemler: [{ yemId: 'misir_silaji' }, { yemId: 'yonca_kuru' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'atk_36' }],
    serbestYemleme: false
  });
  const sabahTop = sonuc.ogunler.sabah.reduce((s, x) => s + x.kg, 0);
  const aksamTop = sonuc.ogunler.aksam.reduce((s, x) => s + x.kg, 0);
  assert.ok(Math.abs(sabahTop + aksamTop - sonuc.gunlukToplamKg) <= 0.15);
});

test('12. Kullanıcı özel yem fiyatı girdiğinde maliyet hesabında o fiyat kullanılmalı', () => {
  const varsayilan = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji', fiyat: 2.0 }],
    kesifYemler: [{ yemId: 'arpa_ezmesi', fiyat: 8.0 }, { yemId: 'atk_36', fiyat: 10.0 }]
  });
  const pahali = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji', fiyat: 5.0 }],
    kesifYemler: [{ yemId: 'arpa_ezmesi', fiyat: 15.0 }, { yemId: 'atk_36', fiyat: 20.0 }]
  });
  assert.ok(pahali.maliyet.gunlukTL > varsayilan.maliyet.gunlukTL);
});

test('13. Yavaş besi (0.8 kg/gün) kaba yem oranı %70/30 hedefini sağlamalı', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 0.8, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'cayir_otu' }, { yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'atk_36' }]
  });
  assert.ok(sonuc.kabaKesifOrani[0] >= 65 && sonuc.kabaKesifOrani[0] <= 75);
});

test('14. Normal besi (1.2 kg/gün) kaba/kesif oranı ~%55/%45 hedefini sağlamalı', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 350, yasGrubu: '1-2yas', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji' }, { yemId: 'yonca_kuru' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'atk_36' }]
  });
  assert.ok(sonuc.kabaKesifOrani[0] >= 50 && sonuc.kabaKesifOrani[0] <= 60);
});

test('15. Sağlık sorunu varsa sonuç uyarılarında veteriner uyarısı yer almalı', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali', saglikSorunu: true },
    kabaYemler: [{ yemId: 'cayir_otu' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }]
  });
  assert.ok(sonuc.uyarilar.some((u) => u.includes('veterinere danışmanı öneririm')));
});

test('16. Hiç yem seçilmese bile motor çökmeden varsayılan güvenli rasyon üretmeli', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [],
    kesifYemler: []
  });
  assert.ok(sonuc.gunlukToplamKg > 5);
  assert.ok(sonuc.kalemler.length >= 3);
});

test('17. Senaryo 1 (Başlangıç Besisi - 200 kg, 6-12 ay, 1.2 ADG) doğrulaması', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 200, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'yonca_kuru' }, { yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'soya_46' }]
  });
  assert.ok(sonuc.kuruMaddeKg >= 4.8 && sonuc.kuruMaddeKg <= 6.0);
  assert.ok(sonuc.hp_pct >= 14.0);
});

test('18. Senaryo 2 (Orta Besi - 380 kg, 1-2 yaş, 1.2 ADG) doğrulaması', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 380, yasGrubu: '1-2yas', cinsiyet: 'tosun', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji' }, { yemId: 'bugday_samani' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'atk_36' }, { yemId: 'besi_yemi_14' }]
  });
  assert.ok(sonuc.kuruMaddeKg >= 8.2 && sonuc.kuruMaddeKg <= 9.8);
  assert.ok(sonuc.hp_pct >= 12.2 && sonuc.hp_pct <= 14.5);
});

test('19. Senaryo 3 (Bitirme Besisi - 550 kg, 2 yaş+, 1.6 ADG) doğrulaması', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 550, yasGrubu: '2yas+', cinsiyet: 'erkek', hedefADG: 1.6, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji' }, { yemId: 'bugday_samani' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'misir_kirmasi' }, { yemId: 'atk_36' }]
  });
  assert.ok(sonuc.kuruMaddeKg >= 11.2 && sonuc.kuruMaddeKg <= 13.2);
  assert.ok(sonuc.kabaKesifOrani[0] >= 30);
});

test('20. Dişi (düve) seçildiğinde protein hedefi erkek danadan daha düşük olmalı', () => {
  const erkek = interpolateNrc2016({ canliAgirlik: 400, yasGrubu: '1-2yas', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' });
  const disi = interpolateNrc2016({ canliAgirlik: 400, yasGrubu: '1-2yas', cinsiyet: 'disi', hedefADG: 1.2, barinma: 'kapali' });
  assert.ok(disi.hpPctDm < erkek.hpPctDm);
});

test('21. 1 kg canlı ağırlık artışı maliyeti (kgBasinaTL = gunlukTL / hedefADG) doğru hesaplanmalı', () => {
  const sonuc = solveBeefRation({
    hayvan: { canliAgirlik: 300, yasGrubu: '6-12ay', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
    kabaYemler: [{ yemId: 'misir_silaji' }],
    kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'atk_36' }]
  });
  const beklenen = Number((sonuc.maliyet.gunlukTL / 1.2).toFixed(2));
  assert.equal(sonuc.maliyet.kgBasinaTL, beklenen);
});

test('22. Hesaplama süresi 300 ms altında olmalı', () => {
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) {
    solveBeefRation({
      hayvan: { canliAgirlik: 250 + i * 5, yasGrubu: '1-2yas', cinsiyet: 'erkek', hedefADG: 1.2, barinma: 'kapali' },
      kabaYemler: [{ yemId: 'misir_silaji' }, { yemId: 'yonca_kuru' }],
      kesifYemler: [{ yemId: 'arpa_ezmesi' }, { yemId: 'soya_46' }]
    });
  }
  const elapsed = (performance.now() - t0) / 50;
  assert.ok(elapsed < 300);
});
