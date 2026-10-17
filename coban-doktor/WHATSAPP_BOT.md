# Çoban Doktor - WhatsApp Bot Kurulum Kılavuzu

"Çoban Doktor" iki farklı şekilde WhatsApp üzerinden çalıştırılabilir:

---

## 1. Web Tabanlı WhatsApp Sohbeti (Hemen Kullanıma Hazır, %100 Çevrimdışı PWA)
- **Canlı Adres:** [https://mserman90.github.io/coban-doktor/](https://mserman90.github.io/coban-doktor/)
- Herhangi bir sunucu, API ücreti veya hat kurulumu gerektirmez.
- Yetiştirici telefonunda tıpkı gerçek WhatsApp gibi balonlu sohbet eder.
- Sonuç ekranında **"📲 WhatsApp ile Veterinerime İlet"** butonuna basıldığında, oluşturulan teşhis ve küpe raporu doğrudan telefonundaki resmi WhatsApp uygulamasını açarak seçtiği hekime tek tıkla mesaj olarak gönderilir.

---

## 2. Gerçek Bir WhatsApp Telefon Numarasına Bot Olarak Bağlama (Otomasyon)

Çoban Doktor'u kendi çiftliğinizin veya veteriner kliniğinizin resmi WhatsApp numarasına (+90 5xx xxx xx xx) bağlayıp gelen mesajlara otomatik cevap veren bir bot yapmak isterseniz:

### Yöntem A: Meta WhatsApp Cloud API (Resmi & Ücretsiz İlk 1000 Mesaj/Ay)
1. [Meta for Developers](https://developers.facebook.com/) üzerinde bir WhatsApp Business App oluşturun.
2. Webhook URL olarak sunucunuzdaki `/webhook` adresini girin.
3. `whatsapp-bot.js` dosyasını çalıştırın:
```bash
npm install express axios dotenv
node whatsapp-bot.js
```

### Yöntem B: Baileys / QR Kod ile WhatsApp Web Bağlantısı (Numara Bağlama)
Herhangi bir ekstra telefon numarasını QR kod ile bağlayarak WhatsApp Web üzerinden bot çalıştırabilirsiniz.
