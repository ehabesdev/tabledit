# 📊 Tabledit

<div align="center">

![Version](https://img.shields.io/badge/version-2025_Firebase-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)


[🚀 **Canlı Demo**](https://ehabesdev.github.io/tabledit) | [📚 **Dökümantasyon**](#-detaylı-kullanım-kılavuzu) | [🐛 **Hata Bildir**](https://github.com/ehabesdev/tabledit/issues)

</div>

---

## 🆕 Yeni Özellikler (2025 Firebase Edition)

### 🔐 **Gelişmiş Kullanıcı Yönetimi**
- 🔥 **Firebase Authentication** entegrasyonu
- 📝 **Kullanıcı kayıt sistemi** (Ad-soyad, il/ilçe bilgileri)
- 🔑 **Güvenli giriş/çıkış** sistemi
- 👤 **Kullanıcı profil yönetimi**
- 🏠 **Türkiye il/ilçe dropdown sistemi**

### ☁️ **Bulut Veritabanı Desteği**
- 🗄️ **Firestore Database** entegrasyonu
- 💾 **Otomatik tablo kaydetme** (30 saniye aralıklarla)
- 📁 **Kullanıcı dosya yönetimi**
- 🔒 **Güvenlik kuralları** ile veri koruması
- 📊 **Sürüm takibi** ve meta data

### 🎨 **Modern Kullanıcı Arayüzü**
- 🔔 **Gerçek zamanlı bildirimler**
- 🎭 **Auth modal sistemleri**
- 🌟 **Gradient tasarım** ve modern UI/UX
- ⚡ **Loading animasyonları**

---

## ✨ Ana Özellikler

### 📝 **Gelişmiş Tablo Düzenleme**
- ➕ **Dinamik satır/sütun ekleme** (başa veya sona)
- ✏️ **Çift tıklama ile başlık düzenleme**
- 🗑️ **Tekil ve çoklu satır silme modu**
- 🎯 **Akıllı hücre/satır/sütun seçimi**
- 🔢 **Otomatik ID numaralandırma**

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

# Firebase yapılandırması (gerekli)
# js/firebase-config.js dosyasını kendi Firebase projeniz ile güncelleyin

# Local server başlat (önerilen)
python -m http.server 8000
# veya
npx live-server

# Tarayıcıda açın
http://localhost:8000
```

### 🔥 **Firebase Kurulumu**
1. [Firebase Console](https://console.firebase.google.com)'da yeni proje oluşturun
2. Authentication'ı aktifleştirin (Email/Password)
3. Firestore Database'i başlatın
4. Web app ekleyin ve config bilgilerini alın
5. `js/firebase-config.js` dosyasını kendi bilgilerinizle güncelleyin

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 📦 **Bağımlılıklar**
Proje aşağıdaki CDN kütüphanelerini kullanır:
- **Firebase v10.7.1** - Authentication & Firestore
- **SheetJS (xlsx)** v0.18.5 - Temel Excel işlemleri
- **ExcelJS** v4.3.0 - Gelişmiş Excel formatları

---

## 📖 Detaylı Kullanım Kılavuzu

### 🔐 **Kullanıcı Sistemi**
```javascript
📝 Kayıt Ol        → Email, şifre, ad-soyad, il/ilçe
🔑 Giriş Yap       → Email ve şifre ile giriş
👤 Profil Yönetimi → Kullanıcı bilgileri ve avatar
🚪 Güvenli Çıkış   → Oturum sonlandırma
```

### 💾 **Veri Yönetimi**
```javascript
☁️ Otomatik Kayıt  → 30 saniyede bir Firebase'e kaydet
📁 Dosya Yönetimi  → Kullanıcıya özel dosya listesi
📊 Sürüm Takibi   → Her değişiklik için versiyon
🔒 Güvenlik       → Kullanıcı bazlı erişim kontrolü
```

### 1️⃣ **Temel Düzenleme İşlemleri**
```javascript
➕ Satır Ekle       → Tabloya yeni satır ekler (otomatik ID)
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
💾 Kaydet (Ctrl+S)  → Firebase'e kaydet + Excel export
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
🔔 Bildirimler     → Başarı/hata mesajları
👤 Avatar Sistemi  → Kullanıcı adı başharfleri
```

---

## 🛠️ Teknik Detaylar

### 📁 **Dosya Yapısı**
```
tabledit/
├── index.html              # Ana HTML dosyası
├── css/
│   ├── index.css           # Ana stil dosyası
│   └── auth.css            # Authentication stilleri
├── js/
│   ├── index.js            # Ana JavaScript
│   ├── auth.js             # Firebase Auth yönetimi
│   ├── user-manager.js     # Kullanıcı dosya yönetimi
│   └── firebase-config.js  # Firebase yapılandırması
├── img/
│   ├── agd_logo.png        # Logo dosyası
│   ├── favicon.png         # Favicon
│   └── bg_agd.png          # Arka plan resmi
└── README.md               # Bu dosya
```

### 🔧 **Kullanılan Teknolojiler**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling, Grid, Flexbox, Gradients
- **Vanilla JavaScript ES6+** - Modern JavaScript özellikleri
- **Firebase v10** - Authentication & Firestore Database
- **ExcelJS** - Gelişmiş Excel işlemleri
- **SheetJS** - Temel Excel okuma

### 🔥 **Firebase Entegrasyonu**
- **Firebase Authentication** - Kullanıcı doğrulama
- **Cloud Firestore** - NoSQL veritabanı
- **Security Rules** - Veri güvenliği
- **Real-time Updates** - Gerçek zamanlı güncellemeler

### 📊 **Performans Özellikleri**
- ⚡ **Hızlı yükleme** (~800ms)
- 💾 **Optimize edilmiş bellek kullanımı**
- 🔄 **Smooth animasyonlar**
- 📱 **Progressive Web App** özellikleri

---

## 🔒 Güvenlik Özellikleri

### 🛡️ **Veri Güvenliği**
- 🔐 **Kullanıcı bazlı erişim kontrolü**
- 🔍 **Input validasyonu ve sanitizasyon**
- 🚫 **XSS koruması**
- 📝 **Rate limiting** (kayıt/giriş denemeleri)

### 🔏 **Firebase Security Rules**
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
    match /userFiles/{fileId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🤝 Katkıda Bulunma

Geliştirmeye katkıda bulunmak için:

1. 🍴 **Fork** edin
2. 🌿 **Feature branch** oluşturun (`git checkout -b feature/yeni-ozellik`)
3. 💾 **Commit** yapın (`git commit -m 'feat: Firebase auth sistemi eklendi'`)
4. 📤 **Push** edin (`git push origin feature/yeni-ozellik`)
5. 🔃 **Pull Request** açın

### 🐛 **Hata Bildirimi**
Hata bulduğunuzda lütfen aşağıdaki bilgileri ekleyin:
- Tarayıcı ve versiyon
- Firebase console hataları
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
| 🔥 Firebase Servisleri | 2 (Auth + Firestore) |
| 🆓 Ücretsiz | ✅ Tamamen |
| 🔧 Bağımlılık | 3 CDN |
| 🏠 Türkiye İl/İlçe | 6 İl + 42 İlçe |

</div>

---

## 📝 Sürüm Notları

### v2025.1.0 - Firebase Edition (Ocak 2025)
#### 🆕 Yeni Özellikler
- ✅ Firebase Authentication entegrasyonu
- ✅ Cloud Firestore veri tabanı desteği
- ✅ Kullanıcı kayıt/giriş sistemi
- ✅ Otomatik tablo kaydetme (30s)
- ✅ Türkiye il/ilçe dropdown sistemi
- ✅ Kullanıcı profil yönetimi
- ✅ Modern auth modal tasarımı
- ✅ Güvenlik kuralları ve validasyon
- ✅ Rate limiting ve güvenlik önlemleri

#### 🔧 İyileştirmeler
- ✅ Gelişmiş Excel export/import
- ✅ Çoklu satır silme modu
- ✅ Başlık düzenleme özelliği
- ✅ Responsive tasarım
- ✅ Klavye kısayolları
- ✅ Sticky header
- ✅ Modal sistem
- ✅ Loading animasyonları

#### 🏗️ Teknik Güncellemeler
- ✅ ES6+ JavaScript modülleri
- ✅ Modern CSS Grid/Flexbox
- ✅ Firebase v10 entegrasyonu
- ✅ Progressive Web App özellikleri
- ✅ Optimize edilmiş performans

### v2024.12.0 - Classic Edition
- ✅ Temel tablo editörü
- ✅ Excel export/import
- ✅ Renklendirme sistemi
- ✅ CSV desteği

---

## 🌍 Desteklenen Tarayıcılar

| Tarayıcı | Minimum Versiyon | Firebase Desteği |
|----------|------------------|------------------|
| Chrome | 88+ | ✅ Full |
| Firefox | 84+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 88+ | ✅ Full |
| Opera | 74+ | ✅ Full |

---

## 🔗 Yararlı Linkler

- 🔥 [Firebase Konsol](https://console.firebase.google.com)
- 📚 [Firebase Docs](https://firebase.google.com/docs)
- 🎨 [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- 📊 [SheetJS Documentation](https://sheetjs.com/)

---

## 📄 Lisans

Bu proje **MIT** lisansı altında yayınlanmıştır. Detaylar için `LICENSE` dosyasına bakın.

---

<div align="center">

**⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/ehabesdev/tabledit?style=social)](https://github.com/ehabesdev/tabledit/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ehabesdev/tabledit?style=social)](https://github.com/ehabesdev/tabledit/network)

**🔥 Made with ❤️ for personal use**

---

*Son güncelleme: 2025*

</div>
