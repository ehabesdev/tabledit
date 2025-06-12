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

const loadingState = document.getElementById('loadingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');
const noTokenState = document.getElementById('noTokenState');

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
        const tokenDoc = await getDoc(doc(db, 'emailVerificationTokens', token));
        
        if (!tokenDoc.exists()) {
            throw new Error('TOKEN_NOT_FOUND');
        }
        
        const tokenData = tokenDoc.data();
        console.log('✅ Token bulundu:', tokenData);
        const tokenAge = Date.now() - tokenData.createdAt.toMillis();
        const maxAge = 24 * 60 * 60 * 1000; // 24 saat
        
        if (tokenAge > maxAge) {
            throw new Error('TOKEN_EXPIRED');
        }
        
        console.log('👤 Kullanıcı güncelleniyor:', tokenData.userId);
        const userRef = doc(db, 'users', tokenData.userId);
        await updateDoc(userRef, {
            emailVerified: true,
            verifiedAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('✅ Kullanıcı emailVerified = true olarak güncellendi');
        await deleteDoc(doc(db, 'emailVerificationTokens', token));
        console.log('🗑️ Token silindi (tek kullanım)');
        showSuccessState(tokenData.email);
        logVerificationEvent('success', tokenData.userId);
        
    } catch (error) {
        console.error('❌ Doğrulama hatası:', error);
        
        let errorMessage = 'Bilinmeyen bir hata oluştu.';
        let errorCode = error.message;
        
        switch (error.message) {
            case 'TOKEN_NOT_FOUND':
                errorMessage = 'Doğrulama token\'ı bulunamadı. Link geçersiz olabilir.';
                break;
            case 'TOKEN_EXPIRED':
                errorMessage = 'Doğrulama linkinin süresi dolmuş. Lütfen yeni bir doğrulama e-postası isteyin.';
                break;
            case 'PERMISSION_DENIED':
                errorMessage = 'Bu işlem için yetkiniz yok.';
                break;
            default:
                if (error.code) {
                    errorCode = error.code;
                    errorMessage = `Teknik hata: ${error.code}`;
                }
        }
        
        showErrorState(errorMessage, errorCode);
        logVerificationEvent('error', null, errorCode);
    }
}

function showLoadingState() {
    loadingState.style.display = 'block';
    successState.style.display = 'none';
    errorState.style.display = 'none';
    noTokenState.style.display = 'none';
}


function showSuccessState(email) {
    loadingState.style.display = 'none';
    successState.style.display = 'block';
    errorState.style.display = 'none';
    noTokenState.style.display = 'none';
    
    const emailElement = document.getElementById('verifiedEmail');
    if (emailElement) {
        emailElement.textContent = email;
    }
    
    console.log('🎉 Başarı sayfası gösterildi');
}

function showErrorState(message, errorCode = '') {
    loadingState.style.display = 'none';
    successState.style.display = 'none';
    errorState.style.display = 'block';
    noTokenState.style.display = 'none';
    
    const errorDetails = document.getElementById('errorDetails');
    if (errorDetails) {
        errorDetails.innerHTML = `
            <strong>❌ ${message}</strong><br>
            ${errorCode ? `<small>Hata kodu: ${errorCode}</small>` : ''}
        `;
    }
    
    console.log('💥 Hata sayfası gösterildi:', message);
}


function showNoTokenState() {
    loadingState.style.display = 'none';
    successState.style.display = 'none';
    errorState.style.display = 'none';
    noTokenState.style.display = 'block';
    
    console.log('🔍 Token yok sayfası gösterildi');
}


function logVerificationEvent(type, userId = null, errorCode = null) {
    try {
        const eventData = {
            type: `email_verification_${type}`,
            timestamp: new Date(),
            userId: userId,
            errorCode: errorCode,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('📊 Verification event:', eventData);
        
        
    } catch (error) {
        console.warn('⚠️ Analytics logging hatası:', error);
    }
}


export async function checkUserVerificationStatus(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
            return { verified: false, exists: false };
        }
        
        const userData = userDoc.data();
        return {
            verified: userData.emailVerified || false,
            exists: true,
            verifiedAt: userData.verifiedAt || null,
            email: userData.email
        };
        
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
            console.log('✅ Temizlenecek token bulunamadı');
            return 0;
        }
        
        const deletePromises = expiredTokens.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`🗑️ ${expiredTokens.size} adet süresi dolmuş token temizlendi`);
        return expiredTokens.size;
        
    } catch (error) {
        console.error('❌ Token temizleme hatası:', error);
        return -1;
    }
}

window.emailVerification = {
    checkUserVerificationStatus,
    cleanupExpiredTokens,
    verifyEmailToken
};