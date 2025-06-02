# 📊 Tabledit

<div align="center">

![Version](https://img.shields.io/badge/version-2025-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**🎯 web tablosu editörü - Excel benzeri güçlü özellikler!**

[🚀 **Canlı Dene**](https://ehabesdev.github.io/tabledit) | [📚 **Dökümantasyon**](#-detaylı-kullanım-kılavuzu) | [🐛 **Hata Bildir**](https://github.com/ehabesdev/tabledit/issues)

</div>

---

## ✨ Özellikler

### 📝 **Gelişmiş Tablo Düzenleme**
- ➕ **Dinamik satır/sütun ekleme** (başa veya sona)
- ✏️ **Çift tıklama ile başlık düzenleme**
- 🗑️ **Tekil ve çoklu satır silme modu**
- 🎯 **Akıllı hücre/satır/sütun seçimi**

### 🎨 **Kapsamlı Görsel Biçimlendirme**
- 🌈 **32 farklı renk paleti**
- 🖌️ **Hücre arka plan rengi** (hücre/satır/sütun bazlı)
- ✏️ **Yazı rengi değiştirme**
- 🧹 **Biçimlendirmeyi temizleme**
- 💾 **Renk formatlarını Excel'e aktarma**

### 📊 **Gelişmiş Export/Import Seçenekleri**
- 📈 **Excel Export** (basit & formatlı renkli)
- 📄 **CSV Export** (UTF-8 BOM desteği)
- 💾 **Excel dosyası yükleme** (renk formatları ile)
- 🔄 **ExcelJS ve SheetJS entegrasyonu**
- 🖨️ **Yazdırma desteği**

### 🎛️ **Kullanıcı Dostu Arayüz**
- 📋 **Dropdown menü sistemi**
- ⚡ **Hızlı erişim araç çubuğu**
- ⌨️ **Klavye kısayolları** (Ctrl+S, Ctrl+O, Ctrl+P)
- 📊 **Gerçek zamanlı istatistikler**
- 🎨 **Modern gradient arayüz**
- 🔄 **Sticky header** (yapışkan üst bölüm)

### 🧠 **Akıllı Özellikler**
- 🔢 **Otomatik istatistik hesaplama**
- 🎯 **Seçim bilgilendirme sistemi**
- 🔒 **Read-only hücre desteği**
- 📱 **Modal pencere sistemı**

---

## 🚀 Hızlı Başlangıç

### 🌐 **Online Kullanım**
```
🔗 https://ehabesdev.github.io/tabledit
```

### 💻 **Yerel Kurulum**
```bash
# Repository'yi klonla
git clone https://github.com/ehabesdev/tabledit.git

# Dizine gir
cd tabledit

# index.html'i tarayıcıda aç
open index.html
```

### 📦 **Bağımlılıklar**
Proje aşağıdaki CDN kütüphanelerini kullanır:
- **SheetJS (xlsx)** v0.18.5 - Temel Excel işlemleri
- **ExcelJS** v4.3.0 - Gelişmiş Excel formatları

---

## 📖 Detaylı Kullanım Kılavuzu

### 1️⃣ **Temel Düzenleme İşlemleri**
```javascript
➕ Satır Ekle       → Tabloya yeni satır ekler
➕ Sütun Ekle       → Modal ile sütun ekler (başa/sona)
🗑️ Satır Sil        → Seçili satırı siler
🗑️ Sütun Sil        → Seçili sütunu siler
🔪 Çoklu Silme      → Checkbox'lar ile birden fazla satır seç & sil
✏️ Çift Tık         → Başlık hücrelerini düzenle
```

### 2️⃣ **Seçim Sistemleri**
```javascript
🖱️ Tek Tık         → Hücre seçimi
🖱️ Satır Tık       → Tüm satır seçimi
🖱️ Shift+Başlık    → Tüm sütun seçimi
📱 Çoklu Mod        → Checkbox ile çoklu seçim
```

### 3️⃣ **Renklendirme Sistemi**
```javascript
Seçim Yap → 🎨 Arka Plan → 32 renkten seç
Seçim Yap → ✏️ Yazı Rengi → Renk uygula
🗑️ Temizle → Formatı sıfırla
```

### 4️⃣ **Dosya İşlemleri**
```javascript
💾 Kaydet (Ctrl+S)  → Formatlı Excel (.xlsx)
📂 Aç (Ctrl+O)      → Excel dosyası yükle
📊 Basit Excel      → Sadece veri (.xlsx)
🎨 Formatlı Excel   → Renklerle birlikte (.xlsx)
📄 CSV İndir        → Evrensel format (.csv)
🖨️ Yazdır (Ctrl+P)  → Tablo yazdırma
```

### 5️⃣ **Gelişmiş Özellikler**
```javascript
📊 İstatistik Panel → Satır/sütun/hücre sayısı
🔄 Sticky Header    → Kaydırma sırasında menü sabit
⌨️ Klavye Desteği   → Ctrl+S/O/P kısayolları
```

---

## 🛠️ Teknik Detaylar

### 📁 **Dosya Yapısı**
```
tabledit/
├── index.html          # Ana HTML dosyası
├── css/
│   └── index.css       # Stil dosyası
├── js/
│   └── index.js        # Ana JavaScript
├── img/
│   ├── agd_logo.png    # Logo dosyası
│   ├── favicon.png     # Favicon
│   └── bg_agd.png      # Arka plan resmi
└── README.md           # Bu dosya
```

### 🔧 **Kullanılan Teknolojiler**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling, Grid, Flexbox
- **Vanilla JavaScript** - ES6+ features
- **ExcelJS** - Gelişmiş Excel işlemleri
- **SheetJS** - Temel Excel okuma

### 📊 **Performans Özellikleri**
- ⚡ **Hızlı yükleme** (~500ms)
- 💾 **Düşük bellek kullanımı**
- 🔄 **Smooth animasyonlar**

---

## 🤝 Katkıda Bulunma

Geliştirmeye katkıda bulunmak için:

1. 🍴 **Fork** edin
2. 🌿 **Feature branch** oluşturun (`git checkout -b yeni-ozellik`)
3. 💾 **Commit** yapın (`git commit -m 'Yeni özellik: XYZ eklendi'`)
4. 📤 **Push** edin (`git push origin yeni-ozellik`)
5. 🔃 **Pull Request** açın

### 🐛 **Hata Bildirimi**
Hata bulduğunuzda lütfen aşağıdaki bilgileri ekleyin:
- Tarayıcı ve versiyon
- Hata adımları
- Beklenen davranış

---

## 📊 Proje İstatistikleri

<div align="center">

| Özellik | Değer |
|---------|-------|
| 🎨 Renk Seçeneği | 32 |
| 📊 Export Format | 4 (Excel Basic/Advanced, CSV, Print) |
| ⌨️ Klavye Kısayolu | 3 (Ctrl+S/O/P) |
| 🆓 Ücretsiz | ✅ Tamamen |
| 🔧 Bağımlılık | 2 CDN |

</div>

---

## 📝 Sürüm Notları

### v2025
- ✅ Gelişmiş Excel export/import
- ✅ Çoklu satır silme modu
- ✅ Başlık düzenleme özelliği
- ✅ Responsive tasarım
- ✅ Klavye kısayolları
- ✅ Sticky header
- ✅ Modal sistem

---

## 📄 Lisans

Bu proje **MIT** lisansı altında yayınlanmıştır. Detaylar için `LICENSE` dosyasına bakın.

---

<div align="center">

**⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/ehabesdev/tabledit?style=social)](https://github.com/ehabesdev/tabledit/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ehabesdev/tabledit?style=social)](https://github.com/ehabesdev/tabledit/network)

**Made with ❤️ for personal use**

---

*Son güncelleme: 2025*

</div>
