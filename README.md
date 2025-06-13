# 🚀 **Tabledit**

<div align="center">

![Tabledit Logo](img/agd_logo.png)

**🎯 Modern • 🔥 Hızlı • 💎 Profesyonel**

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

**Tabledit**, Excel benzeri güçlü özelliklerle donatılmış, bulut tabanlı modern tablo editörüdür. 
Gerçek zamanlı işbirliği, gelişmiş dosya yönetimi ve profesyonel UI/UX deneyimi sunar.

[🎮 **Canlı Demo**](https://ehabesdev.github.io/tabledit) • [📖 **Kullanım Kılavuzu**](#-kullanım-kılavuzu) • [🐛 **Hata Bildir**](https://github.com/ehabesdev/tabledit/issues)

</div>

---

## ✨ **Öne Çıkan Özellikler**

### 🔥 **Güçlü Tablo Editörü**
- 📊 **Excel benzeri** hücre düzenleme
- 🎨 **Renk paleti** ve formatting seçenekleri
- 📈 **Gerçek zamanlı** istatistikler
- 💾 **Otomatik kaydetme** sistemi

### 📁 **Gelişmiş Dosya Yönetimi**
- 🔍 **Akıllı arama** ve filtreleme
- 📤 **Drag & drop** dosya yükleme
- 🗂️ **Grid/List** görünüm modları
- 📋 **Bulk operations** (toplu işlemler)

### ⚡ **Performans & Güvenlik**
- 🔐 **Firebase Authentication** entegrasyonu
- 📧 **Email verification** sistemi
- 🚀 **Performance monitoring**
- 💨 **Offline mode** desteği

---

## 🎯 **Hızlı Başlangıç**

### 📋 **Gereksinimler**
- 🌐 Modern web tarayıcısı (Chrome, Firefox, Safari, Edge)
- 🔥 Firebase projesi (opsiyonel - kendi sunucunuz için)
- 🖥️ HTTP server (development için)

### 🚀 **Kurulum**

```bash
# 1️⃣ Projeyi klonlayın
git clone https://github.com/ehabesdev/tabledit.git
cd tabledit

# 2️⃣ HTTP server başlatın
python3 -m http.server 8000
# veya
npx serve .

# 3️⃣ Tarayıcıda açın
open http://localhost:8000
```

### ⚙️ **Firebase Konfigürasyonu**

```javascript
// js/firebase-config.js dosyasını düzenleyin
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... diğer config değerleri
};
```

---

## 🎮 **Kullanım Kılavuzu**

### 🎯 **Temel İşlemler**

| İşlem | Açıklama | Kısayol |
|-------|----------|---------|
| 📄 **Yeni Tablo** | Boş tablo oluştur | `Ctrl + N` |
| 💾 **Kaydet** | Tabloyu kaydet | `Ctrl + S` |
| 📂 **Aç** | Dosya yükle | `Ctrl + O` |
| 🖨️ **Yazdır** | Tabloyu yazdır | `Ctrl + P` |

### ⌨️ **Klavye Kısayolları**

#### 📊 **Tablo Editörü**
- `Ctrl + S` - Kaydet
- `Ctrl + O` - Dosya Aç
- `Ctrl + P` - Yazdır

#### 📁 **Dosya Yönetimi**
- `Ctrl + F` - Arama Kutusuna Odaklan
- `Ctrl + A` - Tümünü Seç
- `Ctrl + R` - Yenile
- `Delete` - Seçili Dosyaları Sil
- `F2` - Dosya Adını Değiştir
- `Enter` - Dosyayı Aç
- `Escape` - Seçimi Temizle

### 🔍 **Gelişmiş Arama**

```
🎯 Dosya Adı: "budget"
📏 Boyut: 100KB - 1MB
📅 Tarih: Son 30 gün
📊 Satır/Sütun: 10-100 arası
```

---

## 🏗️ **Proje Yapısı**

```
tabledit/
├── 📁 css/                 # Stil dosyaları
│   ├── 🎨 style.css       # Ana stil
│   ├── 📁 files.css       # Dosya yönetimi stilleri
│   └── 🔐 auth.css        # Authentication stilleri
├── 📁 js/                  # JavaScript dosyaları
│   ├── ⚡ index.js        # Ana uygulama
│   ├── 📁 files.js        # Dosya yönetimi
│   ├── 🔥 firebase-config.js # Firebase ayarları
│   └── 🔐 auth.js         # Authentication
├── 📁 img/                 # Görseller
├── 🏠 index.html          # Ana sayfa
├── 📁 files.html          # Dosya yönetimi sayfası
└── 📖 README.md           # Bu dosya
```

---

## 🎨 **Özellik Galerisi**

### 🎭 **Animasyonlar**

- ✨ **Smooth transitions** - Sayfa geçişleri
- 🌊 **Hover effects** - Buton etkileşimleri  
- 📱 **Loading animations** - Yükleme göstergeleri

---

## 🔧 **Geliştirici Rehberi**

### 🧩 **Modüler Yapı**

| Modül | Sorumluluk | Dosya |
|-------|------------|-------|
| 🔐 **Auth** | Kullanıcı yönetimi | `auth.js` |
| 📁 **Files** | Dosya işlemleri | `files.js` |
| 📊 **Editor** | Tablo düzenleme | `index.js` |
| 🎨 **UI** | Arayüz bileşenleri | `style.css` |

### 🚀 **Performans Optimizasyonları**

- ⚡ **Lazy loading** - İhtiyaç anında yükleme
- 💾 **Local caching** - Offline destek
- 🔄 **Debounced search** - Akıllı arama
- 📊 **Performance monitoring** - Gerçek zamanlı izleme

---

## 🤝 **Katkıda Bulunma**

### 🎯 **Nasıl Katkıda Bulunurum?**

1. 🍴 **Fork** edin
2. 🌿 **Branch** oluşturun (`git checkout -b feature/amazing-feature`)
3. 💾 **Commit** yapın (`git commit -m 'feat: Add amazing feature'`)
4. 📤 **Push** edin (`git push origin feature/amazing-feature`)
5. 🔄 **Pull Request** açın

### 📋 **Geliştirme Kuralları**

- ✅ **ESLint** kurallarına uyun
- 📝 **Commit mesajları** conventional format
- 🧪 **Test** yazın (gelecek sürümlerde)
- 📖 **Dokümantasyon** güncelleyin

---

## 🐛 **Bilinen Sorunlar & Çözümler**

### ❌ **Firebase bağlantı hatası**
```javascript
// Çözüm: firebase-config.js dosyasını kontrol edin
const firebaseConfig = {
  // Doğru config değerlerini girin
};
```

### ❌ **Dosya yükleme sorunu**
- 📏 **Dosya boyutu**: Max 1MB
- 📄 **Format**: .xlsx, .xls, .csv
- 🌐 **Tarayıcı**: Modern tarayıcı kullanın

### ❌ **Performans sorunları**
- 🧹 **Cache temizle**: `Ctrl + Shift + R`
- 🔄 **Sayfayı yenile**: `F5`
- 📊 **Büyük tablolar**: Sayfalama kullanın

---

## 📊 **İstatistikler**

<div align="center">

| 📈 **Metrik** | 📊 **Değer** |
|:---:|:---:|
| 🚀 **Performans Skoru** | 95/100 |
| ♿ **Erişilebilirlik** | AA Uyumlu |
| 📱 **Responsive** | %100 |
| 🔒 **Güvenlik** | A+ |

</div>

---

## 🏆 **Sürüm Geçmişi**

### 🎉 **v2.0.0** - *Büyük Güncelleme*
- ✨ **Yeni**: Gelişmiş dosya yönetimi
- 🎨 **Yeni**: Modern UI/UX tasarımı
- ⌨️ **Yeni**: Klavye kısayolları
- 🔍 **Yeni**: Akıllı arama sistemi
- 🚀 **İyileştirme**: Performans optimizasyonları
- 🐛 **Düzeltme**: Auth sistem hataları

### 📋 **v1.0.0** - *İlk Sürüm*
- 🎯 **Temel**: Tablo editörü
- 🔐 **Temel**: Firebase entegrasyonu
- 💾 **Temel**: Dosya kaydetme

---


## 📄 **Lisans**

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<div align="center">

### 🌟 **Tabledit ile Tablolarınızı Profesyonel Seviyeye Taşıyın!**

**Made with ❤️ by [ehabesdev](https://github.com/ehabesdev)**

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!** ⭐

</div>
