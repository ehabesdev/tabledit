import { auth, db } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

console.log('📧 Email Verification modülü yüklendi');

// DOM elementleri
const loadingState = document.getElementById('loadingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');
const noTokenState = document.getElementById('noTokenState');

// URL'den token al
const verificationToken = window.verificationToken;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Doğrulama sayfası yüklendi');
    
    if (!verificationToken) {
        console.log('❌ Token bulunamadı');
        showNoTokenState();
        return;
    }
    
    console.log('🔑 Token bulundu, doğrulama başlatılıyor:', verificationToken.substring(0, 10) + '...');
    await verifyEmailToken(verificationToken);
});

async function verifyEmailToken(token) {
    try {
        showLoadingState();
        console.log('🔍 Token Firestore\'da aranıyor...');
        
        // Token'ı Firestore'dan bul
        const tokenDoc = await getDoc(doc(db, 'emailVerificationTokens', token));
        
        if (!tokenDoc.exists()) {
            throw new Error('TOKEN_NOT_FOUND');
        }
        
        const tokenData = tokenDoc.data();
        console.log('✅ Token bulundu:', {
            userId: tokenData.userId,
            email: tokenData.email,
            used: tokenData.used,
            createdAt: tokenData.createdAt
        });
        
        // Token kullanılmış mı kontrol et
        if (tokenData.used) {
            throw new Error('TOKEN_ALREADY_USED');
        }
        
        // Token süresi dolmuş mu kontrol et
        const tokenAge = Date.now() - tokenData.createdAt.toMillis();
        const maxAge = 24 * 60 * 60 * 1000; // 24 saat
        
        if (tokenAge > maxAge) {
            throw new Error('TOKEN_EXPIRED');
        }
        
        console.log('👤 Kullanıcı doğrulama işlemi başlatılıyor:', tokenData.userId);
        
        // Kullanıcı verilerini Firestore'da güncelle
        const userRef = doc(db, 'users', tokenData.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error('USER_NOT_FOUND');
        }
        
        // Kullanıcının e-posta doğrulamasını tamamla
        await updateDoc(userRef, {
            emailVerified: true,
            verifiedAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('✅ Kullanıcı emailVerified = true olarak güncellendi');
        
        // Token'ı kullanıldı olarak işaretle ve sil (güvenlik için)
        await updateDoc(doc(db, 'emailVerificationTokens', token), {
            used: true,
            usedAt: new Date()
        });
        
        // Token'ı sil (tek kullanım)
        await deleteDoc(doc(db, 'emailVerificationTokens', token));
        console.log('🗑️ Token silindi (tek kullanım güvenliği)');
        
        // Başarı durumunu göster
        showSuccessState(tokenData.email);
        
        // Analytics/logging
        logVerificationEvent('success', tokenData.userId, tokenData.email);
        
        console.log('🎉 E-posta doğrulama işlemi başarıyla tamamlandı!');
        
    } catch (error) {
        console.error('❌ Doğrulama hatası:', error);
        
        let errorMessage = 'Bilinmeyen bir hata oluştu.';
        let errorCode = error.message;
        
        switch (error.message) {
            case 'TOKEN_NOT_FOUND':
                errorMessage = 'Doğrulama token\'ı bulunamadı veya geçersiz. Link doğru mu kontrol edin.';
                break;
            case 'TOKEN_ALREADY_USED':
                errorMessage = 'Bu doğrulama linki daha önce kullanılmış. E-posta adresiniz zaten doğrulanmış olabilir.';
                break;
            case 'TOKEN_EXPIRED':
                errorMessage = 'Doğrulama linkinin süresi dolmuş (24 saat). Lütfen yeni bir doğrulama e-postası isteyin.';
                break;
            case 'USER_NOT_FOUND':
                errorMessage = 'Kullanıcı kayıtları bulunamadı. Lütfen tekrar kayıt olun.';
                break;
            case 'PERMISSION_DENIED':
                errorMessage = 'Bu işlem için yetkiniz yok.';
                break;
            default:
                if (error.code) {
                    errorCode = error.code;
                    errorMessage = `Teknik hata: ${error.code}`;
                } else {
                    errorMessage = error.message || errorMessage;
                }
        }
        
        showErrorState(errorMessage, errorCode);
        logVerificationEvent('error', null, null, errorCode);
    }
}

function showLoadingState() {
    if (loadingState) loadingState.style.display = 'block';
    if (successState) successState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (noTokenState) noTokenState.style.display = 'none';
    
    console.log('⏳ Loading durumu gösterildi');
}

function showSuccessState(email) {
    if (loadingState) loadingState.style.display = 'none';
    if (successState) successState.style.display = 'block';
    if (errorState) errorState.style.display = 'none';
    if (noTokenState) noTokenState.style.display = 'none';
    
    // E-posta adresini göster
    const emailElement = document.getElementById('verifiedEmail');
    if (emailElement && email) {
        emailElement.textContent = email;
    }
    
    console.log('🎉 Başarı sayfası gösterildi:', email);
    
    // 5 saniye sonra ana sayfaya yönlendir
    setTimeout(() => {
        console.log('🏠 Ana sayfaya yönlendiriliyor...');
        window.location.href = '/';
    }, 5000);
}

function showErrorState(message, errorCode = '') {
    if (loadingState) loadingState.style.display = 'none';
    if (successState) successState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
    if (noTokenState) noTokenState.style.display = 'none';
    
    const errorDetails = document.getElementById('errorDetails');
    if (errorDetails) {
        errorDetails.innerHTML = `
            <strong>❌ ${message}</strong><br>
            ${errorCode ? `<small style="opacity: 0.8; margin-top: 10px; display: block;">Hata kodu: ${errorCode}</small>` : ''}
        `;
    }
    
    console.log('💥 Hata sayfası gösterildi:', message);
}

function showNoTokenState() {
    if (loadingState) loadingState.style.display = 'none';
    if (successState) successState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (noTokenState) noTokenState.style.display = 'block';
    
    console.log('🔍 Token yok sayfası gösterildi');
}

function logVerificationEvent(type, userId = null, email = null, errorCode = null) {
    try {
        const eventData = {
            type: `email_verification_${type}`,
            timestamp: new Date(),
            userId: userId,
            email: email,
            errorCode: errorCode,
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer
        };
        
        console.log('📊 Verification event logged:', eventData);
        
        // Bu veriler ileride analytics için Firestore'a kaydedilebilir
        // await addDoc(collection(db, 'verificationEvents'), eventData);
        
    } catch (error) {
        console.warn('⚠️ Analytics logging hatası:', error);
    }
}

// Public API fonksiyonları
export async function checkUserVerificationStatus(userId) {
    try {
        console.log('🔍 Kullanıcı doğrulama durumu kontrol ediliyor:', userId);
        
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
            return { verified: false, exists: false };
        }
        
        const userData = userDoc.data();
        const result = {
            verified: userData.emailVerified || false,
            exists: true,
            verifiedAt: userData.verifiedAt || null,
            email: userData.email,
            name: userData.name
        };
        
        console.log('✅ Kullanıcı doğrulama durumu:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Kullanıcı doğrulama durumu kontrol hatası:', error);
        return { verified: false, exists: false, error: error.message };
    }
}

export async function cleanupExpiredTokens() {
    try {
        console.log('🧹 Süresi dolmuş token temizliği başlatılıyor...');
        
        const expiredTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 saat önce
        
        const tokensQuery = query(
            collection(db, 'emailVerificationTokens'),
            where('createdAt', '<', expiredTime)
        );
        
        const expiredTokens = await getDocs(tokensQuery);
        
        if (expiredTokens.empty) {
            console.log('✅ Temizlenecek süresi dolmuş token bulunamadı');
            return 0;
        }
        
        console.log(`🗑️ ${expiredTokens.size} adet süresi dolmuş token bulundu, siliniyor...`);
        
        const deletePromises = expiredTokens.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`✅ ${expiredTokens.size} adet süresi dolmuş token temizlendi`);
        return expiredTokens.size;
        
    } catch (error) {
        console.error('❌ Token temizleme hatası:', error);
        return -1;
    }
}

export async function getVerificationTokenInfo(token) {
    try {
        console.log('🔍 Token bilgisi alınıyor:', token.substring(0, 10) + '...');
        
        const tokenDoc = await getDoc(doc(db, 'emailVerificationTokens', token));
        
        if (!tokenDoc.exists()) {
            return { exists: false };
        }
        
        const tokenData = tokenDoc.data();
        const tokenAge = Date.now() - tokenData.createdAt.toMillis();
        const maxAge = 24 * 60 * 60 * 1000; // 24 saat
        
        return {
            exists: true,
            used: tokenData.used || false,
            expired: tokenAge > maxAge,
            email: tokenData.email,
            name: tokenData.name,
            createdAt: tokenData.createdAt,
            ageHours: Math.floor(tokenAge / (60 * 60 * 1000))
        };
        
    } catch (error) {
        console.error('❌ Token bilgisi alma hatası:', error);
        return { exists: false, error: error.message };
    }
}

export async function resendVerificationEmail(userId) {
    try {
        console.log('📧 Doğrulama e-postası yeniden gönderiliyor:', userId);
        
        // Kullanıcı bilgilerini al
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
            throw new Error('Kullanıcı bulunamadı');
        }
        
        const userData = userDoc.data();
        
        if (userData.emailVerified) {
            throw new Error('E-posta zaten doğrulanmış');
        }
        
        // Email sender modülünü dinamik olarak yükle
        const { sendCustomVerificationEmail } = await import('./email-sender.js');
        
        const result = await sendCustomVerificationEmail(
            userId,
            userData.email,
            userData.name
        );
        
        console.log('✅ Doğrulama e-postası yeniden gönderildi');
        return result;
        
    } catch (error) {
        console.error('❌ E-posta yeniden gönderme hatası:', error);
        throw error;
    }
}

// Global erişim için window'a ekle
window.emailVerification = {
    checkUserVerificationStatus,
    cleanupExpiredTokens,
    verifyEmailToken,
    getVerificationTokenInfo,
    resendVerificationEmail
};

// Debug fonksiyonları
window.debugVerificationSystem = function() {
    console.log('🧪 E-posta doğrulama sistemi debug bilgileri:');
    console.log('📧 Email Verification modülü:', {
        checkUserVerificationStatus,
        cleanupExpiredTokens,
        verifyEmailToken,
        getVerificationTokenInfo,
        resendVerificationEmail
    });
    
    console.log('🔑 Mevcut token:', verificationToken);
    
    if (verificationToken) {
        getVerificationTokenInfo(verificationToken).then(info => {
            console.log('📊 Token bilgisi:', info);
        });
    }
    
    return {
        currentToken: verificationToken,
        ready: true
    };
};

// Token kontrol fonksiyonu
window.testTokenValidation = async function(testToken) {
    if (!testToken) {
        testToken = verificationToken || prompt('Test edilecek token\'ı girin:');
    }
    
    if (!testToken) {
        console.log('❌ Token girilmedi');
        return;
    }
    
    console.log('🧪 Token test ediliyor:', testToken.substring(0, 10) + '...');
    
    const info = await getVerificationTokenInfo(testToken);
    console.log('📊 Token test sonucu:', info);
    
    return info;
};