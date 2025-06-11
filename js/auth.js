// Authentication

import { auth, db, securityConfig } from './firebase-config.js';

console.log('🔗 Auth modülü Firebase config\'i import etti');

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendEmailVerification,
    reload
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    updateDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const rateLimitCounter = {
    register: 0,
    login: 0,
    resendVerification: 0,
    lastReset: Date.now()
};

function checkRateLimit(action, limit = 5) {
    const now = Date.now();
    
    if (now - rateLimitCounter.lastReset > 60000) {
        rateLimitCounter.register = 0;
        rateLimitCounter.login = 0;
        rateLimitCounter.resendVerification = 0;
        rateLimitCounter.lastReset = now;
    }
    
    if (rateLimitCounter[action] >= limit) {
        throw new Error(`Çok fazla ${action} denemesi. Lütfen 1 dakika bekleyin.`);
    }
    
    rateLimitCounter[action]++;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[<>]/g, '')
        .substring(0, 100);
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, error: 'Şifre en az 8 karakter olmalıdır.' };
    }
    
    if (!hasUpperCase) {
        return { valid: false, error: 'Şifre büyük harf içermelidir.' };
    }
    
    if (!hasLowerCase) {
        return { valid: false, error: 'Şifre küçük harf içermelidir.' };
    }
    
    if (!hasNumbers) {
        return { valid: false, error: 'Şifre rakam içermelidir.' };
    }
    
    if (!hasSpecialChar) {
        return { valid: false, error: 'Şifre özel karakter içermelidir (!@#$%^&* vb.)' };
    }
    
    return { valid: true };
}

function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

const turkeyData = {
    'İstanbul': ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'],
    'Ankara': ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik', 'Kazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'],
    'İzmir': ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'],
    'Kocaeli': ['Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez'],
    'Antalya': ['Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik'],
    'Bursa': ['Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım']
};

function validateLocation(city, district) {
    return turkeyData[city] && turkeyData[city].includes(district);
}

let currentUser = null;
let isAuthListenerActive = false;

export function initializeAuth() {
    if (isAuthListenerActive) {
        console.log('🔄 Auth listener zaten aktif');
        return;
    }
    
    console.log('🚀 Firebase Auth başlatılıyor...');
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('✅ Kullanıcı giriş yaptı:', user.email);
            console.log('📧 E-posta doğrulama durumu:', user.emailVerified);
            
            currentUser = user;
            
            if (!user.emailVerified) {
                console.log('⚠️ E-posta henüz doğrulanmamış');
                showEmailVerificationWarning();
                return;
            }
            
            await loadUserProfile(user);
            showUserInterface();
        } else {
            console.log('❌ Kullanıcı çıkış yaptı veya giriş yapmamış');
            currentUser = null;
            hideEmailVerificationWarning();
            showAuthInterface();
        }
    });
    
    isAuthListenerActive = true;
    console.log('👂 Auth state listener aktif edildi');
}

function showEmailVerificationWarning() {
    hideAuthInterface();
    hideUserInterface();
    
    const warningDiv = document.getElementById('emailVerificationWarning');
    if (warningDiv) {
        warningDiv.style.display = 'block';
        console.log('⚠️ E-posta doğrulama uyarısı gösterildi');
    }
}

function hideEmailVerificationWarning() {
    const warningDiv = document.getElementById('emailVerificationWarning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
        console.log('✅ E-posta doğrulama uyarısı gizlendi');
    }
}

function showUserInterface() {
    hideEmailVerificationWarning();
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (authButtons) {
        authButtons.style.display = 'none';
        console.log('🔒 Auth butonları gizlendi');
    }
    
    if (userProfile) {
        userProfile.classList.add('active');
        console.log('👤 Kullanıcı profili gösterildi');
    }
}

function hideUserInterface() {
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.classList.remove('active');
        console.log('👤 Kullanıcı profili gizlendi');
    }
}

function showAuthInterface() {
    hideEmailVerificationWarning();
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (authButtons) {
        authButtons.style.display = 'flex';
        console.log('🔓 Auth butonları gösterildi');
    }
    
    if (userProfile) {
        userProfile.classList.remove('active');
        console.log('👤 Kullanıcı profili gizlendi');
    }
}

function hideAuthInterface() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.style.display = 'none';
        console.log('🔒 Auth butonları gizlendi');
    }
}

async function loadUserProfile(user) {
    try {
        console.log('📄 Kullanıcı profili yükleniyor...', user.uid);
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ Kullanıcı verisi bulundu:', userData);
            updateUserDisplay(userData);
        } else {
            console.log('⚠️ Kullanıcı veritabanında bulunamadı, oluşturuluyor...');
            const userData = {
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                createdAt: new Date()
            };
            
            await setDoc(userDocRef, userData);
            updateUserDisplay(userData);
            console.log('✅ Yeni kullanıcı verisi oluşturuldu');
        }
    } catch (error) {
        console.error('❌ Kullanıcı profili yüklenirken hata:', error);
        updateUserDisplay({
            name: user.displayName || user.email.split('@')[0],
            email: user.email
        });
    }
}

function updateUserDisplay(userData) {
    console.log('🔄 Kullanıcı gösterimi güncelleniyor:', userData);
    
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && userData.name) {
        const initials = userData.name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatar.textContent = initials;
        console.log('👤 Avatar güncellendi:', initials);
    }
    
    const userNameInNavbar = document.querySelector('.navbar-right .user-name');
    if (userNameInNavbar && userData.name) {
        userNameInNavbar.textContent = sanitizeInput(userData.name);
        console.log('📝 Navbar kullanıcı adı güncellendi:', userData.name);
    }
    
    const dropdownUserName = document.querySelector('.user-dropdown .dropdown-header .user-name');
    const dropdownUserEmail = document.querySelector('.user-dropdown .dropdown-header .user-email');
    
    if (dropdownUserName && userData.name) {
        dropdownUserName.textContent = sanitizeInput(userData.name);
        console.log('📋 Dropdown kullanıcı adı güncellendi:', userData.name);
    }
    
    if (dropdownUserEmail && userData.email) {
        dropdownUserEmail.textContent = sanitizeInput(userData.email);
        console.log('📧 Dropdown email güncellendi:', userData.email);
    }
    
    const allUserNames = document.querySelectorAll('.user-name');
    allUserNames.forEach((element, index) => {
        if (userData.name) {
            element.textContent = sanitizeInput(userData.name);
            console.log(`📝 User name ${index + 1} güncellendi:`, userData.name);
        }
    });
    
    const allUserEmails = document.querySelectorAll('.user-email');
    allUserEmails.forEach((element, index) => {
        if (userData.email) {
            element.textContent = sanitizeInput(userData.email);
            console.log(`📧 User email ${index + 1} güncellendi:`, userData.email);
        }
    });
}

export async function registerUser(userData) {
    try {
        checkRateLimit('register', 3);
        
        const sanitizedData = {
            name: sanitizeInput(userData.name),
            city: sanitizeInput(userData.city),
            district: sanitizeInput(userData.district),
            email: userData.email.toLowerCase().trim(),
            password: userData.password
        };
        
        console.log('📝 Kullanıcı kaydı başlatılıyor:', sanitizedData.email);
        showLoading('register');
        hideAuthError('register');
        
        if (!validateEmail(sanitizedData.email)) {
            throw new Error('Geçersiz e-posta formatı.');
        }
        
        const passwordValidation = validatePassword(sanitizedData.password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.error);
        }
        
        if (!validateLocation(sanitizedData.city, sanitizedData.district)) {
            throw new Error('Geçersiz il/ilçe seçimi.');
        }
        
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            sanitizedData.email, 
            sanitizedData.password
        );
        const user = userCredential.user;
        
        console.log('✅ Firebase Auth kullanıcısı oluşturuldu:', user.uid);
        
        await updateProfile(user, {
            displayName: sanitizedData.name
        });
        
        try {
            await sendEmailVerification(user);
            console.log('📧 E-posta doğrulama gönderildi:', user.email);
        } catch (verifyError) {
            console.warn('⚠️ E-posta doğrulama gönderilemedi:', verifyError);
        }
        
        const userDocData = {
            name: sanitizedData.name,
            email: sanitizedData.email,
            city: sanitizedData.city,
            district: sanitizedData.district,
            createdAt: new Date(),
            lastLogin: new Date(),
            emailVerified: false
        };
        
        await setDoc(doc(db, 'users', user.uid), userDocData);
        console.log('✅ Kullanıcı Firestore\'a kaydedildi');
        
        hideLoading('register');
        showAuthSuccess('register', 'Hesabınız oluşturuldu! Lütfen e-posta adresinizi kontrol edin ve doğrulama linkine tıklayın.');
        
        setTimeout(() => {
            closeAuthModal('register');
        }, 3000);
        
    } catch (error) {
        console.error('❌ Kayıt hatası:', error);
        hideLoading('register');
        
        let errorMessage = 'Kayıt sırasında bir hata oluştu.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Bu e-posta adresi zaten kullanımda.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Şifre çok zayıf. Daha güçlü bir şifre seçin.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Geçersiz e-posta adresi formatı.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'E-posta/şifre ile kayıt aktif değil.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
        
        showAuthError('register', errorMessage);
    }
}

export async function loginUser(email, password) {
    try {
        checkRateLimit('login', 5);
        
        console.log('🔑 Kullanıcı girişi başlatılıyor:', email);
        showLoading('login');
        hideAuthError('login');
        
        const sanitizedEmail = email.toLowerCase().trim();
        
        if (!validateEmail(sanitizedEmail)) {
            throw new Error('Geçersiz e-posta formatı.');
        }
        
        const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
        const user = userCredential.user;
        
        console.log('✅ Firebase auth başarılı:', user.uid);
        console.log('📧 E-posta doğrulama durumu:', user.emailVerified);
        
        if (!user.emailVerified) {
            console.log('❌ E-posta doğrulanmamış, giriş engellendi');
            
            await signOut(auth);
            
            hideLoading('login');
            showAuthError('login', 'E-posta adresinizi henüz doğrulamadınız. Lütfen e-posta kutunuzu kontrol edin.');
            
            setTimeout(() => {
                closeAuthModal('login');
                openEmailVerificationModal(user.email);
            }, 2000);
            
            return;
        }
        
        console.log('✅ Giriş başarılı:', user.uid);
        
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                lastLogin: new Date(),
                emailVerified: true
            });
            console.log('✅ Son giriş zamanı güncellendi');
        } catch (updateError) {
            console.warn('⚠️ Son giriş zamanı güncellenemedi:', updateError);
        }
        
        hideLoading('login');
        showAuthSuccess('login', 'Giriş başarılı! Hoş geldiniz!');
        
        setTimeout(() => {
            closeAuthModal('login');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Giriş hatası:', error);
        hideLoading('login');
        
        let errorMessage = 'Giriş sırasında bir hata oluştu.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Hatalı şifre girdiniz.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Geçersiz e-posta adresi formatı.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Bu hesap devre dışı bırakılmış.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Çok fazla hatalı deneme. Lütfen daha sonra tekrar deneyin.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
        
        showAuthError('login', errorMessage);
    }
}

export async function resendEmailVerification() {
    try {
        checkRateLimit('resendVerification', 3);
        
        if (!currentUser) {
            throw new Error('Kullanıcı bulunamadı');
        }
        
        await reload(currentUser);
        
        if (currentUser.emailVerified) {
            console.log('✅ E-posta zaten doğrulanmış');
            location.reload();
            return;
        }
        
        console.log('📧 E-posta doğrulama yeniden gönderiliyor...');
        
        await sendEmailVerification(currentUser);
        
        console.log('✅ E-posta doğrulama başarıyla gönderildi');
        alert('Doğrulama e-postası gönderildi! Lütfen e-posta kutunuzu kontrol edin.');
        
    } catch (error) {
        console.error('❌ E-posta doğrulama gönderme hatası:', error);
        
        let errorMessage = 'E-posta gönderilirken hata oluştu.';
        
        switch (error.code) {
            case 'auth/too-many-requests':
                errorMessage = 'Çok fazla e-posta gönderildi. Lütfen daha sonra tekrar deneyin.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
        
        alert(errorMessage);
    }
}

export async function checkEmailVerification() {
    try {
        if (!currentUser) {
            console.log('❌ Kullanıcı bulunamadı');
            return;
        }
        
        console.log('🔄 E-posta doğrulama durumu kontrol ediliyor...');
        
        await reload(currentUser);
        
        if (currentUser.emailVerified) {
            console.log('✅ E-posta doğrulandı! Sayfa yenileniyor...');
            
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    emailVerified: true,
                    verifiedAt: new Date()
                });
            } catch (updateError) {
                console.warn('⚠️ Firestore güncelleme hatası:', updateError);
            }
            location.reload();
        } else {
            console.log('⚠️ E-posta henüz doğrulanmamış');
            alert('E-posta henüz doğrulanmamış. Lütfen e-posta kutunuzu kontrol edin.');
        }
        
    } catch (error) {
        console.error('❌ E-posta doğrulama kontrol hatası:', error);
        alert('Kontrol sırasında hata oluştu: ' + error.message);
    }
}

function openEmailVerificationModal(email) {
    const modal = document.getElementById('emailVerificationModal');
    if (modal) {
        const emailSpan = modal.querySelector('.verification-email');
        if (emailSpan) {
            emailSpan.textContent = email;
        }
        modal.classList.add('show');
        console.log('📧 E-posta doğrulama modalı açıldı');
    }
}

export function closeEmailVerificationModal() {
    const modal = document.getElementById('emailVerificationModal');
    if (modal) {
        modal.classList.remove('show');
        console.log('📧 E-posta doğrulama modalı kapatıldı');
    }
}

export async function logoutUser() {
    try {
        console.log('🚪 Kullanıcı çıkışı başlatılıyor...');
        await signOut(auth);
        console.log('✅ Kullanıcı başarıyla çıkış yaptı');
        
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
    } catch (error) {
        console.error('❌ Çıkış hatası:', error);
        alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
    }
}

export function openAuthModal(type) {
    console.log('🔓 Modal açılıyor:', type);
    
    const modal = document.getElementById(`${type}Modal`);
    if (!modal) {
        console.error('❌ Modal bulunamadı:', `${type}Modal`);
        return;
    }
    
    modal.classList.add('show');
    
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    
    hideAuthError(type);
    hideAuthSuccess(type);
    hideLoading(type);
    
    if (type === 'register') {
        setTimeout(() => initializeLocationDropdowns(), 100);
    }
    
    console.log('✅ Modal başarıyla açıldı:', type);
}

export function closeAuthModal(type) {
    console.log('🔒 Modal kapatılıyor:', type);
    
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.classList.remove('show');
        console.log('✅ Modal kapatıldı:', type);
    }
}

function initializeLocationDropdowns() {
    console.log('🗺️ İl/İlçe dropdown\'ları başlatılıyor...');
    
    const citySelect = document.getElementById('registerCity');
    const districtSelect = document.getElementById('registerDistrict');
    
    if (!citySelect || !districtSelect) {
        console.error('❌ İl/İlçe dropdown elementleri bulunamadı');
        return;
    }
    
    citySelect.innerHTML = '<option value="">İl Seçin</option>';
    Object.keys(turkeyData).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
    
    console.log('✅ İller yüklendi:', Object.keys(turkeyData).length);
    
    citySelect.addEventListener('change', function() {
        const selectedCity = this.value;
        console.log('🏙️ İl değişti:', selectedCity);
        
        districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
        
        if (selectedCity && turkeyData[selectedCity]) {
            turkeyData[selectedCity].sort().forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
            console.log('✅ İlçeler yüklendi:', turkeyData[selectedCity].length);
        }
    });
}

export function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        console.log('👤 Kullanıcı dropdown toggle edildi');
    }
}

export function handleRegisterSubmit(event) {
    event.preventDefault();
    console.log('📝 Kayıt formu gönderiliyor...');
    
    const formData = {
        name: document.getElementById('registerName').value.trim(),
        city: document.getElementById('registerCity').value,
        district: document.getElementById('registerDistrict').value,
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value
    };
    
    console.log('📋 Form verileri:', { ...formData, password: '***' });
    
    if (!formData.name || !formData.city || !formData.district || !formData.email || !formData.password) {
        showAuthError('register', 'Lütfen tüm alanları doldurun.');
        return;
    }
    
    if (!isValidEmail(formData.email)) {
        showAuthError('register', 'Geçerli bir e-posta adresi girin.');
        return;
    }
    
    if (formData.password.length < 6) {
        showAuthError('register', 'Şifre en az 6 karakter olmalıdır.');
        return;
    }
    
    registerUser(formData);
}

export function handleLoginSubmit(event) {
    event.preventDefault();
    console.log('🔑 Giriş formu gönderiliyor...');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('📧 Giriş email:', email);
    
    if (!email || !password) {
        showAuthError('login', 'Lütfen e-posta ve şifrenizi girin.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAuthError('login', 'Geçerli bir e-posta adresi girin.');
        return;
    }
    
    loginUser(email, password);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showAuthError(type, message) {
    const errorElement = document.getElementById(`${type}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        console.log('❌ Hata gösterildi:', message);
    }
}

function hideAuthError(type) {
    const errorElement = document.getElementById(`${type}Error`);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

function showAuthSuccess(type, message) {
    const successElement = document.getElementById(`${type}Success`);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.add('show');
        console.log('✅ Başarı mesajı gösterildi:', message);
    }
}

function hideAuthSuccess(type) {
    const successElement = document.getElementById(`${type}Success`);
    if (successElement) {
        successElement.classList.remove('show');
    }
}

function showLoading(type) {
    const loadingElement = document.getElementById(`${type}Loading`);
    const submitButton = document.getElementById(`${type}Submit`);
    
    if (loadingElement) loadingElement.classList.add('show');
    if (submitButton) submitButton.disabled = true;
    console.log('⏳ Loading gösterildi:', type);
}

function hideLoading(type) {
    const loadingElement = document.getElementById(`${type}Loading`);
    const submitButton = document.getElementById(`${type}Submit`);
    
    if (loadingElement) loadingElement.classList.remove('show');
    if (submitButton) submitButton.disabled = false;
    console.log('✅ Loading gizlendi:', type);
}

export function getCurrentUser() {
    return currentUser;
}

export function isUserLoggedIn() {
    return currentUser !== null && currentUser.emailVerified;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM yüklendi, event listener\'lar ekleniyor...');
    
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('auth-modal')) {
            const modalId = event.target.id;
            const type = modalId.replace('Modal', '');
            closeAuthModal(type);
            console.log('🖱️ Modal dışına tıklanarak kapatıldı:', type);
        }
        
        if (!event.target.closest('.user-profile')) {
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
                console.log('🖱️ Kullanıcı dropdown dışına tıklanarak kapatıldı');
            }
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.auth-modal.show');
            if (openModal) {
                const type = openModal.id.replace('Modal', '');
                closeAuthModal(type);
                console.log('⌨️ ESC ile modal kapatıldı:', type);
            }
        }
    });
    
    console.log('✅ Event listener\'lar başarıyla eklendi');
});