import { auth, db, securityConfig } from './firebase-config.js';
import { sendVerificationEmail, resendVerificationEmail, checkUserVerificationStatus } from './email-verification.js';

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    reload
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const rateLimitTracker = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_ATTEMPTS = {
    register: 3,
    login: 5,
    resendVerification: 3
};

function checkRateLimit(action, limit = 5) {
    const now = Date.now();
    const key = `${action}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;
    
    if (!rateLimitTracker.has(key)) {
        rateLimitTracker.set(key, 0);
    }
    
    const attempts = rateLimitTracker.get(key);
    if (attempts >= (MAX_ATTEMPTS[action] || limit)) {
        throw new Error(`Çok fazla ${action} denemesi. Lütfen 1 dakika bekleyin.`);
    }
    
    rateLimitTracker.set(key, attempts + 1);
    
    setTimeout(() => {
        rateLimitTracker.delete(key);
    }, RATE_LIMIT_WINDOW);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[<>&"']/g, (char) => {
            const htmlEntities = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return htmlEntities[char];
        })
        .substring(0, 100);
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Şifre gereklidir.' };
    }
    
    const minLength = 8;
    const maxLength = 128;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, error: `Şifre en az ${minLength} karakter olmalıdır.` };
    }
    
    if (password.length > maxLength) {
        return { valid: false, error: `Şifre en fazla ${maxLength} karakter olabilir.` };
    }
    
    if (!hasUpperCase) {
        return { valid: false, error: 'Şifre en az bir büyük harf içermelidir.' };
    }
    
    if (!hasLowerCase) {
        return { valid: false, error: 'Şifre en az bir küçük harf içermelidir.' };
    }
    
    if (!hasNumbers) {
        return { valid: false, error: 'Şifre en az bir rakam içermelidir.' };
    }
    
    if (!hasSpecialChar) {
        return { valid: false, error: 'Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)' };
    }
    
    return { valid: true };
}

function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const isValid = emailRegex.test(email);
    const isReasonableLength = email.length <= 254;
    
    return isValid && isReasonableLength;
}

function validateName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Ad soyad gereklidir.' };
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return { valid: false, error: 'Ad soyad en az 2 karakter olmalıdır.' };
    }
    
    if (trimmedName.length > 50) {
        return { valid: false, error: 'Ad soyad en fazla 50 karakter olabilir.' };
    }
    
    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
    if (!nameRegex.test(trimmedName)) {
        return { valid: false, error: 'Ad soyad sadece harf ve boşluk içerebilir.' };
    }
    
    return { valid: true };
}

const turkeyData = {
    'İstanbul': ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'],
    'Ankara': ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik', 'Kazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'],
    'İzmir': ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'],
    'Kocaeli': ['Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez'],
    'Antalya': ['Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik'],
    'Bursa': ['Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım']
};

let currentUser = null;
let authStateInitialized = false;

export function initializeAuth() {
    if (authStateInitialized) {

        return;
    }
    

    
    onAuthStateChanged(auth, async (user) => {
        try {
            currentUser = user;
            
            if (user) {

                
                const verificationStatus = await checkUserVerificationStatus(user.uid);
                
                if (!verificationStatus.verified) {

                    showEmailVerificationWarning();
                    await loadUserProfile(user);
                } else {

                    hideEmailVerificationWarning();
                    showUserInterface();
                    await loadUserProfile(user);
                }
            } else {

                currentUser = null;
                hideEmailVerificationWarning();
                showAuthInterface();
            }
        } catch (error) {

            showAuthInterface();
        }
    });
    
    authStateInitialized = true;

}

function showEmailVerificationWarning() {
    hideAuthInterface();
    hideUserInterface();
    
    const warningDiv = document.getElementById('emailVerificationWarning');
    if (warningDiv) {
        warningDiv.style.display = 'block';
    }
}

function hideEmailVerificationWarning() {
    const warningDiv = document.getElementById('emailVerificationWarning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }
}

function showUserInterface() {
    hideEmailVerificationWarning();
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (authButtons) {
        authButtons.style.display = 'none';
    }
    
    if (userProfile) {
        userProfile.classList.add('active');
    }
}

function hideUserInterface() {
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.classList.remove('active');
    }
}

function showAuthInterface() {
    hideEmailVerificationWarning();
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (authButtons) {
        authButtons.style.display = 'flex';
    }
    
    if (userProfile) {
        userProfile.classList.remove('active');
    }
}

function hideAuthInterface() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.style.display = 'none';
    }
}

async function loadUserProfile(user) {
    try {

        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email
        };
        
        if (userDoc.exists()) {
            const firestoreData = userDoc.data();
            userData.name = firestoreData.name || userData.name;
            userData.city = firestoreData.city;
            userData.district = firestoreData.district;
        }
        
        updateUserDisplay(userData);

        
    } catch (error) {

        
        updateUserDisplay({
            name: user.displayName || user.email.split('@')[0],
            email: user.email
        });
    }
}

function updateUserDisplay(userData) {
    try {
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar && userData.name) {
            const initials = userData.name
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .substring(0, 2);
            userAvatar.textContent = initials;
        }
        
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            if (userData.name) {
                element.textContent = sanitizeInput(userData.name);
            }
        });
        
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(element => {
            if (userData.email) {
                element.textContent = sanitizeInput(userData.email);
            }
        });
        
    } catch (error) {

    }
}

export async function registerUser(userData) {
    try {

        
        checkRateLimit('register');
        
        const nameValidation = validateName(userData.name);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }
        
        const sanitizedData = {
            name: sanitizeInput(userData.name),
            city: sanitizeInput(userData.city || 'İstanbul'),
            district: sanitizeInput(userData.district || 'Kadıköy'),
            email: userData.email.toLowerCase().trim(),
            password: userData.password
        };
        
        if (!validateEmail(sanitizedData.email)) {
            throw new Error('Geçersiz e-posta formatı.');
        }
        
        const passwordValidation = validatePassword(sanitizedData.password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.error);
        }
        
        if (!turkeyData[sanitizedData.city] || !turkeyData[sanitizedData.city].includes(sanitizedData.district)) {
            sanitizedData.city = 'İstanbul';
            sanitizedData.district = 'Kadıköy';
        }
        
        showLoading('register');
        hideAuthError('register');
        

        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            sanitizedData.email, 
            sanitizedData.password
        );
        const user = userCredential.user;
        

        
        await updateProfile(user, {
            displayName: sanitizedData.name
        });
        

        
        const userDocData = {
            name: sanitizedData.name,
            email: sanitizedData.email,
            city: sanitizedData.city,
            district: sanitizedData.district,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            emailVerified: false,
            isActive: true,
            registrationMethod: 'email',
            lastLoginAt: null
        };
        
        await setDoc(doc(db, 'users', user.uid), userDocData);

        

        try {
            await sendVerificationEmail(user.uid, sanitizedData.email, sanitizedData.name);

        } catch (emailError) {

            if (emailError.message.includes('permission')) {

            }
        }
        
        hideLoading('register');
        
        let successMessage = `🎉 Hesabınız başarıyla oluşturuldu!`;
        
        try {
            successMessage += `\n\n${sanitizedData.email} adresine doğrulama e-postası gönderildi.`;
            successMessage += `\n\nLütfen e-posta kutunuzu kontrol edin.`;
        } catch {
            successMessage += `\n\nE-posta servisi geçici olarak kullanılamıyor.`;
            successMessage += `\n\nLütfen daha sonra e-posta doğrulama linkini talep edin.`;
        }
        
        showAuthSuccess('register', successMessage);
        
        setTimeout(() => {
            closeAuthModal('register');
        }, 3000);
        

        
    } catch (error) {

        hideLoading('register');
        
        let errorMessage = 'Kayıt sırasında bir hata oluştu.';
        
        if (error.code) {
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
                    errorMessage = 'E-posta/şifre kaydı devre dışı.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'İnternet bağlantınızı kontrol edin.';
                    break;
                case 'permission-denied':
                    errorMessage = 'Kayıt işlemi için gerekli izinler yok.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        showAuthError('register', errorMessage);
    }
}

export async function loginUser(email, password) {
    try {

        
        checkRateLimit('login');
        
        showLoading('login');
        hideAuthError('login');
        
        const sanitizedEmail = email.toLowerCase().trim();
        
        if (!validateEmail(sanitizedEmail)) {
            throw new Error('Geçersiz e-posta formatı.');
        }
        
        if (!password || password.length < 6) {
            throw new Error('Şifre en az 6 karakter olmalıdır.');
        }
        

        const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
        const user = userCredential.user;
        

        
        await updateDoc(doc(db, 'users', user.uid), {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }).catch(updateError => {

        });
        
        const verificationStatus = await checkUserVerificationStatus(user.uid);
        
        hideLoading('login');
        showAuthSuccess('login', '🎉 Giriş başarılı! Hoş geldiniz!');
        
        setTimeout(() => {
            closeAuthModal('login');
        }, 1500);
        

        
    } catch (error) {

        hideLoading('login');
        
        let errorMessage = 'Giriş sırasında bir hata oluştu.';
        
        if (error.code) {
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
                case 'auth/network-request-failed':
                    errorMessage = 'İnternet bağlantınızı kontrol edin.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'E-posta veya şifre hatalı.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        showAuthError('login', errorMessage);
    }
}

export async function resendEmailVerification() {
    try {

        
        checkRateLimit('resendVerification');
        
        if (!currentUser) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            throw new Error('Kullanıcı verisi bulunamadı');
        }
        
        const userData = userDoc.data();
        
        await resendVerificationEmail(currentUser.uid, userData.email, userData.name);
        

        alert('✅ Doğrulama e-postası tekrar gönderildi!\n\nLütfen e-posta kutunuzu kontrol edin.');
        
    } catch (error) {

        
        let errorMessage = 'E-posta gönderilirken hata oluştu.';
        
        if (error.code) {
            switch (error.code) {
                case 'auth/too-many-requests':
                    errorMessage = 'Çok fazla e-posta gönderildi. Lütfen daha sonra tekrar deneyin.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'İnternet bağlantınızı kontrol edin.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        alert('❌ ' + errorMessage);
        throw error;
    }
}

export async function checkEmailVerification() {
    try {

        
        if (!currentUser) {
            alert('❌ Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
            return;
        }
        
        const verificationStatus = await checkUserVerificationStatus(currentUser.uid);
        
        if (verificationStatus.verified) {

            alert('🎉 E-posta başarıyla doğrulandı! Sayfa yenileniyor...');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {

            alert('⚠️ E-posta henüz doğrulanmamış.\n\nLütfen e-posta kutunuzu kontrol edin ve doğrulama linkine tıklayın.\n\nE-posta spam klasörünüzde de olabilir.');
        }
        
    } catch (error) {

        
        let errorMessage = 'Kontrol sırasında hata oluştu.';
        
        if (error.code) {
            switch (error.code) {
                case 'auth/network-request-failed':
                    errorMessage = 'İnternet bağlantınızı kontrol edin.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Çok fazla deneme. Lütfen biraz bekleyin.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        alert('❌ ' + errorMessage);
    }
}

export function closeEmailVerificationModal() {
    const modal = document.getElementById('emailVerificationModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

export async function logoutUser() {
    try {

        
        await signOut(auth);
        
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        

        
    } catch (error) {

        alert('Çıkış yapılırken bir hata oluştu: ' + error.message);
    }
}

export function openAuthModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (!modal) {

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
}

export function closeAuthModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.classList.remove('show');
    }
}

function initializeLocationDropdowns() {
    const citySelect = document.getElementById('registerCity');
    const districtSelect = document.getElementById('registerDistrict');
    
    if (!citySelect || !districtSelect) {
        return;
    }
    
    citySelect.innerHTML = '<option value="">İl Seçin</option>';
    Object.keys(turkeyData).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
    
    citySelect.addEventListener('change', function() {
        const selectedCity = this.value;
        
        districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
        
        if (selectedCity && turkeyData[selectedCity]) {
            turkeyData[selectedCity].sort().forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
    });
}

export function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function showAuthError(type, message) {
    const errorElement = document.getElementById(`${type}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
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
}

function hideLoading(type) {
    const loadingElement = document.getElementById(`${type}Loading`);
    const submitButton = document.getElementById(`${type}Submit`);
    
    if (loadingElement) loadingElement.classList.remove('show');
    if (submitButton) submitButton.disabled = false;
}

export function getCurrentUser() {
    return currentUser;
}

export function isUserLoggedIn() {
    return currentUser !== null;
}

export function isEmailVerified() {
    return currentUser && currentUser.emailVerified;
}

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('auth-modal')) {
            const modalId = event.target.id;
            const type = modalId.replace('Modal', '');
            closeAuthModal(type);
        }
        
        if (!event.target.closest('.user-profile')) {
            const dropdown = document.querySelector('.user-dropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.auth-modal.show');
            if (openModal) {
                const type = openModal.id.replace('Modal', '');
                closeAuthModal(type);
            }
        }
    });
});