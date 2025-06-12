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
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

function generateSecureToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 48; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token + '_' + Date.now().toString(36);
}

export async function createVerificationToken(userId, email, name) {
    try {
        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000));
        
        const tokenData = {
            token: token,
            userId: userId,
            email: email,
            name: name,
            createdAt: new Date(),
            expiresAt: expiresAt,
            used: false,
            ipAddress: null,
            userAgent: navigator.userAgent
        };
        
        await setDoc(doc(db, 'emailVerificationTokens', token), tokenData);
        return token;
        
    } catch (error) {
        console.error('Token creation error:', error);
        throw new Error('Token oluşturulamadı: ' + error.message);
    }
}

async function loadEmailJS() {
    if (window.emailjs) return;
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('EmailJS yüklenemedi'));
    });
    
    window.emailjs.init("4FgJboHOK049FAHSo");
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
            line-height: 1.6; color: #2d3748; background: #f7fafc; padding: 20px 0;
        }
        .container { 
            max-width: 600px; margin: 0 auto; background: white; 
            border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px; text-align: center; color: white;
        }
        .logo { 
            width: 60px; height: 60px; background: rgba(255,255,255,0.2);
            border-radius: 12px; display: inline-flex; align-items: center;
            justify-content: center; font-size: 24px; margin-bottom: 20px;
        }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .welcome { text-align: center; margin-bottom: 35px; }
        .welcome-icon { font-size: 48px; margin-bottom: 20px; }
        .welcome h2 { 
            color: #2d3748; font-size: 24px; margin-bottom: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .user-badge { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; padding: 8px 16px; border-radius: 20px;
            font-weight: 600; display: inline-block; margin: 0 4px;
        }
        .cta-section { 
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;
            border-left: 4px solid #667eea;
        }
        .verify-button { 
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white; text-decoration: none; padding: 16px 32px;
            border-radius: 8px; font-size: 16px; font-weight: 600;
            display: inline-block; box-shadow: 0 4px 12px rgba(72,187,120,0.3);
            transition: all 0.3s ease;
        }
        .verify-button:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 6px 20px rgba(72,187,120,0.4);
        }
        .features { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin: 30px 0;
        }
        .feature { 
            background: #f8fafc; padding: 20px; border-radius: 8px;
            text-align: center; border: 1px solid #e2e8f0;
        }
        .feature-icon { font-size: 32px; margin-bottom: 12px; }
        .feature h4 { color: #2d3748; margin-bottom: 8px; }
        .feature p { color: #4a5568; font-size: 14px; }
        .info-box { 
            background: #fef5e7; border: 1px solid #f6ad55;
            border-radius: 8px; padding: 20px; margin: 25px 0;
        }
        .info-title { color: #c05621; font-weight: 600; margin-bottom: 8px; }
        .info-text { color: #744210; font-size: 14px; }
        .manual-link { 
            background: #f7fafc; border: 1px solid #e2e8f0;
            border-radius: 6px; padding: 12px; font-family: monospace;
            font-size: 12px; word-break: break-all; margin-top: 10px;
        }
        .footer { 
            background: #2d3748; color: #e2e8f0; padding: 30px;
            text-align: center;
        }
        .footer h3 { 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
        }
        .footer p { font-size: 14px; margin: 4px 0; opacity: 0.8; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content, .footer { padding: 25px 20px; }
            .features { grid-template-columns: 1fr; }
            .verify-button { padding: 14px 24px; width: 100%; }
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
                <h3 style="margin-bottom: 15px; color: #2d3748;">🚀 Hesabınızı Aktifleştirin</h3>
                <p style="margin-bottom: 25px; color: #4a5568;">
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
            <p style="margin-top: 20px; font-size: 12px;">
                Tabledit © ${new Date().getFullYear()} - Tüm hakları saklıdır.
            </p>
        </div>
    </div>
</body>
</html>`;
}

export async function sendVerificationEmail(userId, email, name) {
    try {
        await loadEmailJS();
        
        const token = await createVerificationToken(userId, email, name);
        const verificationUrl = `${window.location.origin}/verify.html?token=${token}`;
        const emailHTML = createVerificationEmailHTML(name, email, verificationUrl);
        
        const templateParams = {
            to_email: email,
            from_name: "Tabledit",
            subject: "🎉 Tabledit - E-posta Adresinizi Doğrulayın",
            message_html: emailHTML,
            reply_to: "noreply@tabledit.com"
        };
        
        const result = await window.emailjs.send(
            "service_5g9h3zk",
            "template_07k7p21",
            templateParams
        );
        
        await addDoc(collection(db, 'emailLogs'), {
            userId: userId,
            email: email,
            type: 'verification',
            status: 'sent',
            token: token,
            sentAt: new Date(),
            emailJSResponse: result.text
        });
        
        return {
            success: true,
            token: token,
            verificationUrl: verificationUrl,
            messageId: result.text
        };
        
    } catch (error) {
        console.error('Email sending error:', error);
        
        await addDoc(collection(db, 'emailLogs'), {
            userId: userId,
            email: email,
            type: 'verification',
            status: 'failed',
            error: error.message,
            sentAt: new Date()
        });
        
        throw new Error('E-posta gönderilemedi: ' + error.message);
    }
}

export async function verifyEmailToken(token) {
    try {
        if (!token || token.length < 10) {
            throw new Error('INVALID_TOKEN');
        }
        
        const tokenDoc = await getDoc(doc(db, 'emailVerificationTokens', token));
        
        if (!tokenDoc.exists()) {
            throw new Error('TOKEN_NOT_FOUND');
        }
        
        const tokenData = tokenDoc.data();
        
        if (tokenData.used) {
            throw new Error('TOKEN_ALREADY_USED');
        }
        
        const now = new Date();
        if (now > tokenData.expiresAt.toDate()) {
            throw new Error('TOKEN_EXPIRED');
        }
        
        const userRef = doc(db, 'users', tokenData.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error('USER_NOT_FOUND');
        }
        
        await updateDoc(userRef, {
            emailVerified: true,
            verifiedAt: new Date(),
            updatedAt: new Date()
        });
        
        await updateDoc(doc(db, 'emailVerificationTokens', token), {
            used: true,
            usedAt: new Date(),
            verificationIP: null
        });
        
        await addDoc(collection(db, 'verificationLogs'), {
            userId: tokenData.userId,
            email: tokenData.email,
            token: token,
            status: 'success',
            verifiedAt: new Date(),
            userAgent: navigator.userAgent
        });
        
        return {
            success: true,
            email: tokenData.email,
            userId: tokenData.userId
        };
        
    } catch (error) {
        console.error('Token verification error:', error);
        
        if (token) {
            await addDoc(collection(db, 'verificationLogs'), {
                token: token,
                status: 'failed',
                error: error.message,
                attemptedAt: new Date(),
                userAgent: navigator.userAgent
            });
        }
        
        throw error;
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
        
        for (const doc of existingTokens.docs) {
            await deleteDoc(doc.ref);
        }
        
        return await sendVerificationEmail(userId, email, name);
        
    } catch (error) {
        console.error('Resend verification error:', error);
        throw new Error('E-posta yeniden gönderilemedi: ' + error.message);
    }
}

export async function cleanupExpiredTokens() {
    try {
        const expiredTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
        
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
        console.error('Cleanup error:', error);
        return -1;
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
        console.error('Status check error:', error);
        return { verified: false, exists: false, error: error.message };
    }
}

window.emailVerification = {
    sendVerificationEmail,
    verifyEmailToken,
    resendVerificationEmail,
    cleanupExpiredTokens,
    checkUserVerificationStatus
};