import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    collection, 
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const EMAILJS_CONFIG = {
    PUBLIC_KEY: "4FgJboHOK049FAHSo",
    SERVICE_ID: "service_5g9h3zk",
    TEMPLATE_ID: "template_07k7p21"
};

const EMAIL_TEMPLATES = {
    VERIFICATION: 'verification-email',
    WELCOME: 'welcome-email',
    PASSWORD_RESET: 'password-reset-email',
    NOTIFICATION: 'notification-email'
};

let emailjsInitialized = false;

function generateVerificationToken() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const additionalRandom = Math.random().toString(36).substring(2, 10);
    
    return `${randomPart}${timestamp}${additionalRandom}`.toUpperCase();
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
                setTimeout(() => reject(new Error('EmailJS yükleme zaman aşımı')), 15000);
            });
        }
        
        if (window.emailjs && EMAILJS_CONFIG.PUBLIC_KEY) {
            window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
            emailjsInitialized = true;

            return true;
        }
        
        throw new Error('EmailJS konfigürasyonu eksik');
        
    } catch (error) {

        emailjsInitialized = false;
        return false;
    }
}

async function loadEmailTemplate(templateData) {
    try {

        
        const templatePaths = [
            './templates/verification-email.html',
            './template/verification-email.html'
        ];
        
        let template = null;
        let templateFound = false;
        
        for (const path of templatePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    template = await response.text();
                    templateFound = true;

                    break;
                }
            } catch (fetchError) {

                continue;
            }
        }
        
        if (!templateFound) {

            template = createFallbackEmailTemplate(templateData);
        } else {
            template = processTemplateVariables(template, templateData);
        }
        
        return template;
        
    } catch (error) {
        return createFallbackEmailTemplate(templateData);
    }
}

function processTemplateVariables(template, templateData) {
    let processedTemplate = template;
    
    const variables = {
        USER_NAME: templateData.userName,
        USER_EMAIL: templateData.userEmail,
        VERIFICATION_URL: templateData.verificationUrl,
        CURRENT_YEAR: new Date().getFullYear(),
        CURRENT_DATE: new Date().toLocaleDateString('tr-TR'),
        TIMESTAMP: new Date().toISOString()
    };
    
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value);
    });
    

    return processedTemplate;
}

function createFallbackEmailTemplate(templateData) {

    
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
            line-height: 1.6; color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; padding: 20px;
        }
        .container { 
            max-width: 600px; margin: 0 auto; background: white; 
            border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #03153d, #062a67); 
            color: white; padding: 40px 30px; text-align: center; 
        }
        .header h1 {
            margin: 0 0 10px 0; font-size: 32px; font-weight: 700;
        }
        .content { padding: 40px 30px; }
        .welcome { text-align: center; margin-bottom: 30px; }
        .welcome h2 {
            color: #2c3e50; font-size: 24px; margin-bottom: 20px;
        }
        .user-email {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white; padding: 8px 16px; border-radius: 20px;
            font-weight: 600; display: inline-block; margin: 0 5px;
        }
        .cta-section {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px; padding: 30px; text-align: center;
            margin: 30px 0; border: 2px solid #dee2e6;
        }
        .verify-button { 
            background: linear-gradient(45deg, #27ae60, #229954); 
            color: white; text-decoration: none; 
            padding: 18px 40px; border-radius: 12px; 
            display: inline-block; font-weight: 700; font-size: 18px;
            text-transform: uppercase; letter-spacing: 1px;
            box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3);
            transition: all 0.3s ease;
        }
        .verify-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(39, 174, 96, 0.4);
        }
        .features {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin: 30px 0;
        }
        .feature {
            background: #f8f9fa; padding: 25px 20px; border-radius: 12px;
            text-align: center; border: 2px solid #e9ecef;
        }
        .feature-icon { font-size: 36px; margin-bottom: 15px; display: block; }
        .feature h4 { color: #2c3e50; margin-bottom: 10px; font-size: 16px; }
        .feature p { color: #6c757d; font-size: 14px; margin: 0; }
        .info-box {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #f39c12; border-radius: 10px;
            padding: 20px; margin: 25px 0;
        }
        .info-box h4 { color: #856404; margin: 0 0 10px 0; font-size: 16px; }
        .info-box p { color: #856404; margin: 0; font-size: 14px; }
        .manual-link {
            background: rgba(255,255,255,0.8); border: 1px solid #dee2e6;
            border-radius: 8px; padding: 15px; font-family: monospace;
            font-size: 12px; word-break: break-all; margin-top: 15px;
        }
        .footer { 
            background: linear-gradient(135deg, #2c3e50, #34495e); 
            color: #ecf0f1; padding: 30px; text-align: center; 
        }
        .footer h3 {
            margin: 0 0 15px 0; font-size: 24px;
            background: linear-gradient(45deg, #3498db, #2980b9);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .footer p { margin: 8px 0; font-size: 14px; opacity: 0.9; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content, .footer { padding: 25px 20px; }
            .header h1 { font-size: 24px; }
            .welcome h2 { font-size: 20px; }
            .verify-button { 
                display: block; padding: 15px 20px; font-size: 16px; 
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

        
        const token = generateVerificationToken();
        
        const tokenData = {
            token: token,
            userId: userId,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            createdAt: serverTimestamp(),
            used: false,
            expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)),
            attempts: 0,
            userAgent: navigator.userAgent.substring(0, 500)
        };
        
        try {
            await setDoc(doc(db, 'emailVerificationTokens', token), tokenData);

        } catch (firestoreError) {

            if (firestoreError.code === 'permission-denied') {
                throw new Error('Token kaydetme izni yok. Lütfen tekrar giriş yapın.');
            }
        }
        
        return token;
        
    } catch (error) {

        throw error;
    }
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
            timestamp: new Date().toISOString(),
            provider: 'emailjs'
        };
        
    } catch (error) {

        throw new Error('E-posta gönderilemedi: ' + error.message);
    }
}

async function logEmailActivity(emailData, result) {
    try {
        const logData = {
            to: emailData.to,
            subject: emailData.subject,
            userId: emailData.userId,
            token: emailData.token,
            templateUsed: emailData.templateUsed,
            status: result.success ? 'sent' : 'failed',
            method: result.method,
            messageId: result.messageId || null,
            error: result.error || null,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent.substring(0, 500)
        };
        
        await addDoc(collection(db, 'emailLogs'), logData);

        
    } catch (error) {

    }
}

export async function sendVerificationEmail(userId, email, name, token) {
    try {

        
        const baseUrl = window.location.origin;
        const repoName = '/tabledit'
        const verificationUrl = `${baseUrl}${repoName}/verify.html?token=${token}`;
        
        const templateData = {
            userName: name,
            userEmail: email,
            verificationUrl: verificationUrl
        };
        
        const emailHtml = await loadEmailTemplate(templateData);
        const emailText = createPlainTextEmail(name, email, verificationUrl);
        
        const emailData = {
            to: email.toLowerCase().trim(),
            subject: '🎉 Tabledit - E-posta Adresinizi Doğrulayın',
            html: emailHtml,
            text: emailText,
            userId: userId,
            token: token,
            templateUsed: EMAIL_TEMPLATES.VERIFICATION,
            metadata: {
                userAgent: navigator.userAgent.substring(0, 500),
                timestamp: new Date().toISOString(),
                source: 'custom-email-system'
            }
        };
        
        const sendResult = await sendEmailViaEmailJS(emailData);
        
        await logEmailActivity(emailData, sendResult);
        
        return {
            success: true,
            emailId: 'custom_' + Date.now(),
            token: token,
            verificationUrl: verificationUrl,
            templateUsed: EMAIL_TEMPLATES.VERIFICATION,
            sendResult: sendResult
        };
        
    } catch (error) {

        
        const failResult = { 
            success: false, 
            error: error.message,
            method: 'failed',
            timestamp: new Date().toISOString()
        };
        
        try {
            await logEmailActivity({ 
                to: email, 
                userId: userId, 
                token: token,
                templateUsed: EMAIL_TEMPLATES.VERIFICATION,
                subject: 'E-posta Doğrulama'
            }, failResult);
        } catch (logError) {

        }
        
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

export async function loadTemplate(templateType, templateData) {
    try {

        
        const templatePaths = [
            `./templates/${templateType}.html`, 
            `./template/${templateType}.html`
        ];
        
        for (const path of templatePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    let template = await response.text();
                    template = processTemplateVariables(template, templateData);

                    return template;
                }
            } catch (fetchError) {
                continue;
            }
        }
        
        throw new Error(`Template bulunamadı: ${templateType}`);
        
    } catch (error) {

        throw error;
    }
}

export async function sendCustomVerificationEmail(userId, email, name) {
    try {

        
        const token = await createVerificationToken(userId, email, name);
        const result = await sendVerificationEmail(userId, email, name, token);
        

        
        return {
            success: true,
            token: token,
            verificationUrl: result.verificationUrl,
            emailId: result.emailId,
            templateUsed: result.templateUsed,
            sendResult: result.sendResult
        };
        
    } catch (error) {

        throw error;
    }
}

export async function getEmailStats() {
    try {

        
        return {
            totalSent: 0,
            totalPending: 0,
            totalFailed: 0,
            successRate: 0,
            lastEmailSent: null,
            templatesUsed: {
                [EMAIL_TEMPLATES.VERIFICATION]: 0,
                [EMAIL_TEMPLATES.WELCOME]: 0,
                [EMAIL_TEMPLATES.PASSWORD_RESET]: 0,
                [EMAIL_TEMPLATES.NOTIFICATION]: 0
            }
        };
        
    } catch (error) {

        return null;
    }
}

export async function validateEmailService() {
    try {
        const emailjsReady = await initializeEmailJS();
        return {
            emailjs: emailjsReady,
            templates: true,
            configuration: EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
        };
    } catch (error) {
        return {
            emailjs: false,
            templates: false,
            configuration: false,
            error: error.message
        };
    }
}

if (typeof window !== 'undefined') {
    window.emailSender = {
        sendCustomVerificationEmail,
        createVerificationToken,
        sendVerificationEmail,
        loadTemplate,
        EmailTemplates: EMAIL_TEMPLATES,
        getEmailStats,
        validateEmailService
    };
    
    window.setupEmailJS = function(publicKey, serviceId, templateId) {
        EMAILJS_CONFIG.PUBLIC_KEY = publicKey;
        EMAILJS_CONFIG.SERVICE_ID = serviceId;
        EMAILJS_CONFIG.TEMPLATE_ID = templateId;
        emailjsInitialized = false;
        
        console.log('✅ EmailJS yapılandırıldı:', {
            publicKey: publicKey.substring(0, 10) + '...',
            serviceId,
            templateId
        });
        
        return true;
    };
    
    window.debugEmailSystem = function() {
        
        const testToken = generateVerificationToken();
        const testUrl = `${window.location.origin}/verify.html?token=${testToken}`;
        
        return {
            testToken,
            testUrl,
            emailJSConfigured: EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY",
            emailJSInitialized: emailjsInitialized,
            ready: true
        };
    };
    
    window.testEmailSending = async function(testEmail = 'test@example.com') {

        
        try {
            const testResult = await validateEmailService();
            if (!testResult.emailjs) {
                throw new Error('EmailJS servisi hazır değil');
            }
            
            const testData = {
                to: testEmail,
                subject: 'Test E-postası - Tabledit',
                html: createFallbackEmailTemplate({
                    userName: 'Test Kullanıcı',
                    userEmail: testEmail,
                    verificationUrl: `${window.location.origin}/verify.html?token=TEST_TOKEN_123`
                })
            };
            
            const result = await sendEmailViaEmailJS(testData);

            return result;
            
        } catch (error) {

            return { success: false, error: error.message };
        }
    };
}

export { EMAIL_TEMPLATES as EmailTemplates };