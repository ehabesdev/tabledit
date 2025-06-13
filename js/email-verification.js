import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const EMAILJS_CONFIG = {
    PUBLIC_KEY: "4FgJboHOK049FAHSo",
    SERVICE_ID: "service_5g9h3zk",
    TEMPLATE_ID: "template_07k7p21"
};

let emailjsInitialized = false;

function generateSecureToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 48; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

async function initializeEmailJS() {
    if (emailjsInitialized) return true;
    
    try {
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.async = true;
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error('EmailJS yüklenemedi'));
                setTimeout(() => reject(new Error('EmailJS yükleme zaman aşımı')), 10000);
            });
        }
        
        if (window.emailjs && EMAILJS_CONFIG.PUBLIC_KEY) {
            window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
            emailjsInitialized = true;

            return true;
        }
        
        throw new Error('EmailJS yapılandırması eksik');
        
    } catch (error) {

        emailjsInitialized = false;
        return false;
    }
}

export async function createVerificationToken(userId, email, name) {
    try {
        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));
        
        const tokenData = {
            token: token,
            userId: userId,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            createdAt: serverTimestamp(),
            expiresAt: expiresAt,
            used: false,
            ipAddress: null,
            userAgent: navigator.userAgent.substring(0, 500),
            attempts: 0,
            lastAttempt: null
        };
        
        await setDoc(doc(db, 'emailVerificationTokens', token), tokenData);

        return token;
        
    } catch (error) {

        if (error.code === 'permission-denied') {
            throw new Error('Token oluşturma yetkisi yok. Lütfen tekrar giriş yapın.');
        }
        throw new Error('Token oluşturulamadı: ' + error.message);
    }
}

function createVerificationEmailHTML(userName, userEmail, verificationUrl) {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-posta Doğrulama - Tabledit</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.7; color: #2d3748; background: #f7fafc; padding: 20px 0;
        }
        .container { 
            max-width: 600px; margin: 0 auto; background: white; 
            border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 50px 30px; text-align: center; color: white; position: relative;
        }
        .header::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%);
        }
        .logo { 
            width: 80px; height: 80px; background: rgba(255,255,255,0.2);
            border-radius: 16px; display: inline-flex; align-items: center;
            justify-content: center; font-size: 32px; margin-bottom: 24px;
            position: relative; z-index: 2;
        }
        .header h1 { font-size: 32px; margin-bottom: 12px; position: relative; z-index: 2; }
        .header p { opacity: 0.9; font-size: 16px; position: relative; z-index: 2; }
        .content { padding: 50px 30px; }
        .welcome { text-align: center; margin-bottom: 40px; }
        .welcome-icon { font-size: 64px; margin-bottom: 24px; }
        .welcome h2 { 
            color: #2d3748; font-size: 28px; margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .user-badge { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; padding: 10px 20px; border-radius: 25px;
            font-weight: 600; display: inline-block; margin: 0 8px;
        }
        .cta-section { 
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 16px; padding: 40px 30px; text-align: center; margin: 40px 0;
            border-left: 4px solid #667eea;
        }
        .verify-button { 
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white; text-decoration: none; padding: 18px 36px;
            border-radius: 12px; font-size: 18px; font-weight: 700;
            display: inline-block; box-shadow: 0 8px 25px rgba(72,187,120,0.3);
            transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 1px;
        }
        .features { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 24px; margin: 40px 0;
        }
        .feature { 
            background: #f8fafc; padding: 24px; border-radius: 12px;
            text-align: center; border: 1px solid #e2e8f0;
        }
        .feature-icon { font-size: 36px; margin-bottom: 16px; }
        .feature h4 { color: #2d3748; margin-bottom: 12px; }
        .feature p { color: #4a5568; font-size: 14px; }
        .info-box { 
            background: #fef5e7; border: 1px solid #f6ad55;
            border-radius: 12px; padding: 24px; margin: 30px 0;
        }
        .info-title { color: #c05621; font-weight: 600; margin-bottom: 12px; }
        .info-text { color: #744210; font-size: 14px; }
        .manual-link { 
            background: #f7fafc; border: 1px solid #e2e8f0;
            border-radius: 8px; padding: 16px; font-family: monospace;
            font-size: 12px; word-break: break-all; margin-top: 12px;
        }
        .footer { 
            background: #2d3748; color: #e2e8f0; padding: 40px 30px;
            text-align: center;
        }
        .footer h3 { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
        }
        .footer p { font-size: 14px; margin: 8px 0; opacity: 0.8; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content, .footer { padding: 30px 20px; }
            .features { grid-template-columns: 1fr; }
            .verify-button { padding: 16px 28px; width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📊</div>
            <h1>Hoş Geldiniz!</h1>
            <p>Tabledit ailesine katıldığınız için teşekkürler</p>
        </div>
        
        <div class="content">
            <div class="welcome">
                <div class="welcome-icon">🎉</div>
                <h2>Merhaba ${userName}!</h2>
                <p>
                    <span class="user-badge">${userEmail}</span> 
                    adresli hesabınızla Tabledit'e başarıyla kaydoldunuz!
                </p>
            </div>
            
            <div class="cta-section">
                <h3 style="margin-bottom: 20px; color: #2d3748;">🚀 Hesabınızı Aktifleştirin</h3>
                <p style="margin-bottom: 30px; color: #4a5568;">
                    Tabledit'in tüm özelliklerini kullanabilmek için 
                    e-posta adresinizi doğrulamanız gerekiyor.
                </p>
                <a href="${verificationUrl}" class="verify-button">
                    ✅ E-postamı Doğrula
                </a>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">📊</div>
                    <h4>Excel Uyumluluğu</h4>
                    <p>Excel dosyalarını kolayca yükleyin ve düzenleyin</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🎨</div>
                    <h4>Akıllı Renklendirme</h4>
                    <p>Tablolarınızı istediğiniz gibi özelleştirin</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">☁️</div>
                    <h4>Bulut Depolama</h4>
                    <p>Verileriniz güvenle bulutta saklanır</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔄</div>
                    <h4>Gerçek Zamanlı</h4>
                    <p>Değişiklikler anında kaydedilir</p>
                </div>
            </div>
            
            <div class="info-box">
                <div class="info-title">🔗 Buton çalışmıyorsa</div>
                <div class="info-text">
                    Aşağıdaki linki kopyalayıp tarayıcınızın adres çubuğuna yapıştırın:
                </div>
                <div class="manual-link">${verificationUrl}</div>
            </div>
            
            <div class="info-box">
                <div class="info-title">🔒 Güvenlik Bilgisi</div>
                <div class="info-text">
                    Bu doğrulama linki 24 saat geçerlidir ve sadece bir kez kullanılabilir. 
                    Hesabınızın güvenliği için bu e-postayı kimseyle paylaşmayın.
                    Bu e-postayı siz talep etmediyseniz güvenle silebilirsiniz.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <h3>📊 Tabledit</h3>
            <p><strong>Modern Tablo Düzenleme Sistemi</strong></p>
            <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.</p>
            <p>Herhangi bir sorunuz varsa destek ekibimizle iletişime geçin.</p>
            <p style="margin-top: 24px; font-size: 12px;">
                Tabledit © ${new Date().getFullYear()} - Tüm hakları saklıdır.
            </p>
        </div>
    </div>
</body>
</html>`;
}

async function sendEmailViaEmailJS(emailData) {
    try {
        const emailjsReady = await initializeEmailJS();
        if (!emailjsReady) {
            throw new Error('EmailJS servisi kullanılamıyor');
        }
        
        const templateParams = {
            to_email: emailData.to,
            from_name: "Tabledit",
            subject: emailData.subject,
            message_html: emailData.html,
            reply_to: "noreply@tabledit.com"
        };
        
        const result = await window.emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams
        );
        

        return {
            success: true,
            method: 'emailjs',
            messageId: result.text,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {

        throw new Error('E-posta gönderilemedi: ' + error.message);
    }
}

export async function sendVerificationEmail(userId, email, name) {
    try {

        
        const token = await createVerificationToken(userId, email, name);
        const repoName = '/tabledit';
        const verificationUrl = `${window.location.origin}${repoName}/verify.html?token=${token}`;
        const emailHTML = createVerificationEmailHTML(name, email, verificationUrl);
        
        const emailData = {
            to: email.toLowerCase().trim(),
            subject: "🎉 Tabledit - E-posta Adresinizi Doğrulayın",
            html: emailHTML
        };
        
        const sendResult = await sendEmailViaEmailJS(emailData);
        
        try {
            await addDoc(collection(db, 'emailLogs'), {
                userId: userId,
                email: email.toLowerCase().trim(),
                type: 'verification',
                status: 'sent',
                token: token,
                sentAt: serverTimestamp(),
                sendMethod: sendResult.method,
                messageId: sendResult.messageId
            });

        } catch (logError) {

        }
        
        return {
            success: true,
            token: token,
            verificationUrl: verificationUrl,
            messageId: sendResult.messageId
        };
        
    } catch (error) {

        
        try {
            await addDoc(collection(db, 'emailLogs'), {
                userId: userId,
                email: email,
                type: 'verification',
                status: 'failed',
                error: error.message,
                sentAt: serverTimestamp()
            });
        } catch (logError) {

        }
        
        throw new Error('E-posta gönderilemedi: ' + error.message);
    }
}

export async function verifyEmailToken(token) {
    try {
        if (!token || token.length < 20) {
            throw new Error('INVALID_TOKEN');
        }
        
        const tokenDocRef = doc(db, 'emailVerificationTokens', token);
        const tokenDoc = await getDoc(tokenDocRef);
        
        if (!tokenDoc.exists()) {
            throw new Error('TOKEN_NOT_FOUND');
        }
        
        const tokenData = tokenDoc.data();
        
        await updateDoc(tokenDocRef, {
            attempts: (tokenData.attempts || 0) + 1,
            lastAttempt: serverTimestamp()
        });
        
        if (tokenData.used) {
            throw new Error('TOKEN_ALREADY_USED');
        }
        
        const now = new Date();
        const expiresAt = tokenData.expiresAt.toDate();
        if (now > expiresAt) {
            throw new Error('TOKEN_EXPIRED');
        }
        
        const userRef = doc(db, 'users', tokenData.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error('USER_NOT_FOUND');
        }
        
        await updateDoc(userRef, {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        await updateDoc(tokenDocRef, {
            used: true,
            usedAt: serverTimestamp(),
            verificationIP: null
        });
        
        await addDoc(collection(db, 'verificationLogs'), {
            userId: tokenData.userId,
            email: tokenData.email,
            token: token,
            status: 'success',
            verifiedAt: serverTimestamp(),
            userAgent: navigator.userAgent.substring(0, 500)
        });
        

        
        return {
            success: true,
            email: tokenData.email,
            userId: tokenData.userId,
            userName: tokenData.name
        };
        
    } catch (error) {

        
        const errorCode = error.message;
        let userMessage = 'Doğrulama sırasında bir hata oluştu.';
        
        switch (errorCode) {
            case 'INVALID_TOKEN':
                userMessage = 'Geçersiz doğrulama linki.';
                break;
            case 'TOKEN_NOT_FOUND':
                userMessage = 'Doğrulama linki bulunamadı.';
                break;
            case 'TOKEN_ALREADY_USED':
                userMessage = 'Bu doğrulama linki daha önce kullanılmış.';
                break;
            case 'TOKEN_EXPIRED':
                userMessage = 'Doğrulama linkinin süresi dolmuş.';
                break;
            case 'USER_NOT_FOUND':
                userMessage = 'Kullanıcı hesabı bulunamadı.';
                break;
        }
        
        if (token) {
            try {
                await addDoc(collection(db, 'verificationLogs'), {
                    token: token,
                    status: 'failed',
                    error: errorCode,
                    userMessage: userMessage,
                    attemptedAt: serverTimestamp(),
                    userAgent: navigator.userAgent.substring(0, 500)
                });
            } catch (logError) {

            }
        }
        
        const enhancedError = new Error(userMessage);
        enhancedError.code = errorCode;
        throw enhancedError;
    }
}

export async function resendVerificationEmail(userId, email, name) {
    try {

        
        const existingTokensQuery = query(
            collection(db, 'emailVerificationTokens'),
            where('userId', '==', userId),
            where('used', '==', false)
        );
        
        const existingTokens = await getDocs(existingTokensQuery);
        
        const deletePromises = existingTokens.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        return await sendVerificationEmail(userId, email, name);
        
    } catch (error) {

        throw new Error('E-posta yeniden gönderilemedi: ' + error.message);
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
            email: userData.email,
            name: userData.name
        };
        
    } catch (error) {

        return { verified: false, exists: false, error: error.message };
    }
}

export async function cleanupExpiredTokens() {
    try {
        const now = new Date();
        const expiredTime = new Date(now.getTime() - (25 * 60 * 60 * 1000));
        
        const expiredQuery = query(
            collection(db, 'emailVerificationTokens'),
            where('expiresAt', '<', expiredTime)
        );
        
        const expiredTokens = await getDocs(expiredQuery);
        
        if (expiredTokens.empty) {
            return 0;
        }
        
        const deletePromises = expiredTokens.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        

        return expiredTokens.size;
        
    } catch (error) {

        return -1;
    }
}

if (typeof window !== 'undefined') {
    window.emailVerification = {
        sendVerificationEmail,
        verifyEmailToken,
        resendVerificationEmail,
        cleanupExpiredTokens,
        checkUserVerificationStatus
    };
}