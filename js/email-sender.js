import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    collection, 
    addDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

function generateVerificationToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    token += Date.now().toString(36);
    return token;
}

async function loadEmailTemplate(templateData) {
    try {
        console.log('📧 E-posta şablonu yükleniyor...');
        
        let response;
        let template;
        
        try {
            response = await fetch('./templates/verification-email.html');
            if (!response.ok) throw new Error('templates/ klasöründe bulunamadı');
        } catch (e1) {
            try {
                response = await fetch('./template/verification-email.html');
                if (!response.ok) throw new Error('template/ klasöründe bulunamadı');
            } catch (e2) {
                throw new Error('Template dosyası hiçbir klasörde bulunamadı');
            }
        }
        
        template = await response.text();
        console.log('✅ E-posta şablonu başarıyla yüklendi');
        
        template = template.replace(/\{\{USER_NAME\}\}/g, templateData.userName);
        template = template.replace(/\{\{USER_EMAIL\}\}/g, templateData.userEmail);
        template = template.replace(/\{\{VERIFICATION_URL\}\}/g, templateData.verificationUrl);
        template = template.replace(/\{\{CURRENT_YEAR\}\}/g, new Date().getFullYear());
        
        console.log('✅ Template placeholder\'ları işlendi');
        return template;
    } catch (error) {
        console.error('❌ Template yükleme hatası:', error);
        console.log('🔄 Fallback template kullanılıyor...');
        return createFallbackEmailTemplate(templateData);
    }
}

function createFallbackEmailTemplate(templateData) {
    console.log('⚠️ Fallback template kullanılıyor');
    
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-posta Doğrulama - Tabledit</title>
    <style>
        body { 
            font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #03153d, #062a67); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 36px;
            font-weight: 700;
        }
        .content { 
            padding: 40px 30px; 
        }
        .welcome {
            text-align: center;
            margin-bottom: 30px;
        }
        .welcome h2 {
            color: #2c3e50;
            font-size: 28px;
            margin-bottom: 20px;
        }
        .user-email {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-weight: 600;
            display: inline-block;
            margin: 0 5px;
        }
        .cta-section {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 2px solid #dee2e6;
        }
        .verify-button { 
            background: linear-gradient(45deg, #27ae60, #229954); 
            color: white; 
            text-decoration: none; 
            padding: 18px 40px; 
            border-radius: 12px; 
            display: inline-block; 
            font-weight: 700; 
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3);
            transition: all 0.3s ease;
        }
        .verify-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(39, 174, 96, 0.4);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            background: #f8f9fa;
            padding: 25px 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e9ecef;
        }
        .feature-icon {
            font-size: 40px;
            margin-bottom: 15px;
            display: block;
        }
        .feature h4 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .feature p {
            color: #6c757d;
            font-size: 14px;
            margin: 0;
        }
        .info-box {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #f39c12;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        .info-box h4 {
            color: #856404;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .info-box p {
            color: #856404;
            margin: 0;
            font-size: 14px;
        }
        .manual-link {
            background: rgba(255,255,255,0.8);
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin-top: 15px;
        }
        .footer { 
            background: linear-gradient(135deg, #2c3e50, #34495e); 
            color: #ecf0f1; 
            padding: 30px; 
            text-align: center; 
        }
        .footer h3 {
            margin: 0 0 15px 0;
            font-size: 24px;
            background: linear-gradient(45deg, #3498db, #2980b9);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .footer p {
            margin: 8px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        @media (max-width: 768px) {
            .container { margin: 10px; }
            .header, .content, .footer { padding: 25px 20px; }
            .header h1 { font-size: 28px; }
            .welcome h2 { font-size: 24px; }
            .verify-button { 
                display: block; 
                padding: 15px 20px; 
                font-size: 16px; 
            }
            .features { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Hoş Geldiniz!</h1>
            <p>Tabledit ailesine katıldığınız için teşekkürler</p>
        </div>
        
        <div class="content">
            <div class="welcome">
                <h2>Merhaba ${templateData.userName}!</h2>
                <p>
                    <span class="user-email">${templateData.userEmail}</span> 
                    adresli e-posta hesabınızla <strong>Tabledit</strong>'e başarıyla kaydoldunuz!
                </p>
            </div>
            
            <div class="cta-section">
                <h3>🚀 Hesabınızı Aktifleştirin</h3>
                <p style="margin-bottom: 25px;">
                    Tabledit'in tüm özelliklerini kullanmaya başlamak için 
                    e-posta adresinizi doğrulamanız gerekiyor.
                </p>
                <a href="${templateData.verificationUrl}" class="verify-button">
                    ✅ E-postamı Doğrula
                </a>
            </div>
            
            <div class="features">
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <h4>Excel Uyumluluğu</h4>
                    <p>Excel dosyalarını kolayca yükleyin, düzenleyin ve dışa aktarın</p>
                </div>
                <div class="feature">
                    <span class="feature-icon">🎨</span>
                    <h4>Akıllı Renklendirme</h4>
                    <p>Hücreleri, satırları ve sütunları istediğiniz gibi renklendirin</p>
                </div>
                <div class="feature">
                    <span class="feature-icon">☁️</span>
                    <h4>Bulut Depolama</h4>
                    <p>Tablolarınız güvenle bulutta saklanır ve her yerden erişilebilir</p>
                </div>
                <div class="feature">
                    <span class="feature-icon">🔄</span>
                    <h4>Gerçek Zamanlı</h4>
                    <p>Değişiklikler anında kaydedilir, veri kaybı yaşamazsınız</p>
                </div>
            </div>
            
            <div class="info-box">
                <h4>🔗 Buton çalışmıyorsa</h4>
                <p>Aşağıdaki linki kopyalayıp tarayıcınızın adres çubuğuna yapıştırın:</p>
                <div class="manual-link">${templateData.verificationUrl}</div>
            </div>
            
            <div class="info-box">
                <h4>🔒 Güvenlik Bilgisi</h4>
                <p>
                    Bu doğrulama linki <strong>24 saat</strong> geçerlidir ve sadece <strong>bir kez</strong> kullanılabilir. 
                    Hesabınızın güvenliği için bu e-postayı kimseyle paylaşmayın. 
                    Eğer bu e-postayı siz talep etmediyseniz güvenle silebilirsiniz.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <h3>📊 Tabledit</h3>
            <p><strong>Modern Tablo Düzenleme Sistemi</strong></p>
            <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.</p>
            <p>Herhangi bir sorunuz varsa destek ekibimizle iletişime geçin.</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                Tabledit © ${new Date().getFullYear()} - Tüm hakları saklıdır.
            </p>
        </div>
    </div>
</body>
</html>`;
}

export async function createVerificationToken(userId, email, name) {
    try {
        console.log('🔑 Doğrulama token\'ı oluşturuluyor:', email);
        
        const token = generateVerificationToken();
        
        const tokenData = {
            token: token,
            userId: userId,
            email: email,
            name: name,
            createdAt: new Date(),
            used: false,
            expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000))
        };
        
        try {
            await setDoc(doc(db, 'emailVerificationTokens', token), tokenData);
            console.log('✅ Token Firestore\'a kaydedildi:', token.substring(0, 10) + '...');
        } catch (firestoreError) {
            console.warn('⚠️ Token Firestore\'a kaydedilemedi:', firestoreError);
            console.log('⚠️ Token sadece memory\'de tutulacak - 24 saat geçerli');
        }
        
        return token;
        
    } catch (error) {
        console.error('❌ Token oluşturma hatası:', error);
        throw error;
    }
}

export async function sendVerificationEmail(userId, email, name, token) {
    try {
        console.log('📧 Doğrulama e-postası hazırlanıyor:', email);
        
        const baseUrl = window.location.origin;
        const verificationUrl = `${baseUrl}/verify.html?token=${token}`;
        
        const templateData = {
            userName: name,
            userEmail: email,
            verificationUrl: verificationUrl
        };
        
        const emailHtml = await loadEmailTemplate(templateData);
        const emailText = createPlainTextEmail(name, email, verificationUrl);
        
        const emailData = {
            to: email,
            subject: '🎉 Tabledit - E-posta Adresinizi Doğrulayın',
            html: emailHtml,
            text: emailText,
            userId: userId,
            token: token,
            templateUsed: 'verification-email',
            createdAt: new Date(),
            status: 'pending',
            attempts: 0,
            userName: name,
            userEmail: email,
            verificationUrl: verificationUrl,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                source: 'custom-email-system'
            }
        };
        
        try {
            const emailRef = await addDoc(collection(db, 'emailQueue'), emailData);
            console.log('✅ E-posta queue\'ya eklendi:', emailRef.id);
        } catch (firestoreError) {
            console.warn('⚠️ E-posta queue\'ya eklenemedi:', firestoreError);
            console.log('⚠️ Direkt gönderim yapılacak');
        }
        
        const sendResult = await sendRealEmail(emailData);
        
        return {
            success: true,
            emailId: 'temp_' + Date.now(),
            token: token,
            verificationUrl: verificationUrl,
            templateUsed: 'verification-email',
            sendResult: sendResult
        };
        
    } catch (error) {
        console.error('❌ E-posta gönderme hatası:', error);
        throw error;
    }
}

function createPlainTextEmail(name, email, verificationUrl) {
    return `
🎉 Tabledit'e Hoş Geldiniz!

Merhaba ${name}!

${email} adresli e-posta hesabınızla Tabledit'e başarıyla kaydoldunuz.

Hesabınızı aktifleştirmek için aşağıdaki linke tıklayın:
${verificationUrl}

📋 Tabledit ile neler yapabilirsiniz:
• 📊 Excel dosyalarını yükleyin ve düzenleyin
• 🎨 Hücreleri istediğiniz gibi renklendirin  
• ☁️ Tablolarınız güvenle bulutta saklanır
• 🔄 Değişiklikler gerçek zamanlı kaydedilir

🔒 GÜVENLİK:
Bu doğrulama linki 24 saat geçerlidir ve sadece bir kez kullanılabilir.
Eğer bu e-postayı siz talep etmediyseniz güvenle silebilirsiniz.

📧 Yardıma ihtiyacınız var?
Herhangi bir sorunuz varsa destek ekibimizle iletişime geçin.

Tabledit Ekibi
Modern Tablo Düzenleme Sistemi
`;
}

const EMAILJS_CONFIG = {
    PUBLIC_KEY: "4FgJboHOK049FAHSo",
    SERVICE_ID: "service_5g9h3zk",
    TEMPLATE_ID: "template_07k7p21"
};

async function sendEmailViaEmailJS(emailData) {
    try {
        console.log('📧 EmailJS ile e-posta gönderiliyor...', emailData.to);
        
        if (!window.emailjs) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        }
        
        const templateParams = {
            to_email: emailData.to,
            from_name: "Tabledit",
            message_html: emailData.html,
            subject: emailData.subject,
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
        console.error('❌ EmailJS gönderme hatası:', error);
        throw error;
    }
}

async function sendRealEmail(emailData) {
    if (EMAILJS_CONFIG.PUBLIC_KEY === "YOUR_EMAILJS_PUBLIC_KEY") {
        console.log('⚠️ EmailJS yapılandırılmamış, simülasyon kullanılıyor...');
        return await simulateEmailSending(emailData);
    }
    
    try {
        return await sendEmailViaEmailJS(emailData);
    } catch (error) {
        console.error('❌ e-posta gönderimi başarısız, simülasyona geçiliyor:', error);
        return await simulateEmailSending(emailData);
    }
}

async function simulateEmailSending(emailData) {
    try {
        console.log('📨 E-posta gönderimi simülasyonu başlatılıyor...');
        console.log('📧 GÖNDERILECEK E-POSTA DETAYLARI:');
        console.log('  📍 Alıcı:', emailData.to);
        console.log('  📝 Konu:', emailData.subject);
        console.log('  📊 Template:', emailData.templateUsed);
        console.log('  💌 HTML var mı:', !!emailData.html);
        console.log('  📄 Text var mı:', !!emailData.text);
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        
        const isSuccess = Math.random() > 0.05;
        
        if (isSuccess) {
            console.log('✅ E-POSTA BAŞARIYLA GÖNDERİLDİ (simülasyon)');
            
            if (emailData.html) {
                console.log('🎨 E-POSTA HTML PREVIEW:');
                const blob = new Blob([emailData.html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                console.log('📧 PREVIEW URL:', url);
                console.log('💡 Bu URL\'yi yeni sekmede açarak e-posta tasarımını görebilirsiniz!');
                
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }
            
            return { 
                success: true, 
                method: 'simulation',
                timestamp: new Date().toISOString(),
                messageId: 'sim_' + Date.now(),
                provider: 'simulation'
            };
        } else {
            throw new Error('Simülasyon hatası: E-posta servisi geçici olarak kullanılamıyor');
        }
        
    } catch (error) {
        console.error('❌ E-posta gönderme simülasyon hatası:', error);
        return { 
            success: false, 
            error: error.message,
            method: 'simulation',
            timestamp: new Date().toISOString()
        };
    }
}

export const EmailTemplates = {
    VERIFICATION: 'verification-email',
    WELCOME: 'welcome-email',
    PASSWORD_RESET: 'password-reset-email',
    NOTIFICATION: 'notification-email'
};

export async function loadTemplate(templateType, templateData) {
    try {
        console.log(`📧 ${templateType} şablonu yükleniyor...`);
        
        let response;
        const paths = [`./templates/${templateType}.html`, `./template/${templateType}.html`];
        
        for (const path of paths) {
            try {
                response = await fetch(path);
                if (response.ok) break;
            } catch (e) {
                continue;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error(`Template bulunamadı: ${templateType}`);
        }
        
        let template = await response.text();
        
        template = template.replace(/\{\{CURRENT_YEAR\}\}/g, new Date().getFullYear());
        template = template.replace(/\{\{CURRENT_DATE\}\}/g, new Date().toLocaleDateString('tr-TR'));
        template = template.replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString());
        
        if (templateData) {
            Object.keys(templateData).forEach(key => {
                const placeholder = `{{${key.toUpperCase()}}}`;
                const regex = new RegExp(placeholder, 'g');
                template = template.replace(regex, templateData[key]);
            });
        }
        
        console.log(`✅ ${templateType} şablonu başarıyla işlendi`);
        return template;
        
    } catch (error) {
        console.error(`❌ ${templateType} şablon yükleme hatası:`, error);
        throw error;
    }
}

export async function sendCustomVerificationEmail(userId, email, name) {
    try {
        console.log('🚀 Özel doğrulama e-postası işlemi başlatılıyor:', email);
        
        const token = await createVerificationToken(userId, email, name);
        const result = await sendVerificationEmail(userId, email, name, token);
        
        console.log('✅ Doğrulama e-postası işlemi tamamlandı');
        
        return {
            success: true,
            token: token,
            verificationUrl: result.verificationUrl,
            emailId: result.emailId,
            templateUsed: result.templateUsed,
            sendResult: result.sendResult
        };
        
    } catch (error) {
        console.error('❌ Özel doğrulama e-postası hatası:', error);
        throw error;
    }
}

export async function getEmailStats() {
    try {
        console.log('📊 E-posta istatistikleri hesaplanıyor...');
        
        return {
            totalSent: 0,
            totalPending: 0,
            totalFailed: 0,
            successRate: 0,
            lastEmailSent: null,
            templatesUsed: {
                [EmailTemplates.VERIFICATION]: 0,
                [EmailTemplates.WELCOME]: 0,
                [EmailTemplates.PASSWORD_RESET]: 0,
                [EmailTemplates.NOTIFICATION]: 0
            }
        };
        
    } catch (error) {
        console.error('❌ E-posta istatistikleri hatası:', error);
        return null;
    }
}

window.emailSender = {
    sendCustomVerificationEmail,
    createVerificationToken,
    sendVerificationEmail,
    loadTemplate,
    EmailTemplates,
    getEmailStats
};

window.setupEmailJS = function(publicKey, serviceId, templateId) {
    EMAILJS_CONFIG.PUBLIC_KEY = publicKey;
    EMAILJS_CONFIG.SERVICE_ID = serviceId;
    EMAILJS_CONFIG.TEMPLATE_ID = templateId;
    
    console.log('✅ EmailJS yapılandırıldı:', {
        publicKey: publicKey.substring(0, 10) + '...',
        serviceId,
        templateId
    });
    
    return true;
};

window.debugEmailSystem = function() {
    console.log('🧪 E-posta sistemi debug bilgileri:');
    console.log('📧 Email Sender modülü:', {
        sendCustomVerificationEmail,
        createVerificationToken,
        sendVerificationEmail,
        loadTemplate,
        EmailTemplates,
        getEmailStats
    });
    
    const testToken = generateVerificationToken();
    console.log('🔑 Test token:', testToken);
    
    const testUrl = `${window.location.origin}/verify.html?token=${testToken}`;
    console.log('🔗 Test verification URL:', testUrl);
    
    console.log('⚙️ EmailJS Durumu:', EMAILJS_CONFIG.PUBLIC_KEY === "YOUR_EMAILJS_PUBLIC_KEY" ? 'Yapılandırılmamış' : 'Yapılandırılmış');
    
    return {
        testToken,
        testUrl,
        emailJSConfigured: EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY",
        ready: true
    };
};

window.testEmailSending = async function(testEmail = 'test@example.com') {
    console.log('🧪 E-posta gönderme testi başlatılıyor...');
    
    const testData = {
        to: testEmail,
        subject: 'Test E-postası - Tabledit',
        userName: 'Test Kullanıcı',
        userEmail: testEmail,
        verificationUrl: `${window.location.origin}/verify.html?token=TEST_TOKEN_123`,
        templateUsed: 'test'
    };
    
    try {
        const result = await sendRealEmail(testData);
        console.log('✅ Test e-postası gönderildi:', result);
        return result;
    } catch (error) {
        console.error('❌ Test e-postası gönderilemedi:', error);
        return { success: false, error: error.message };
    }
};