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
        
        const response = await fetch('./templates/verification-email.html');
        
        if (!response.ok) {
            throw new Error('Template dosyası yüklenemedi');
        }
        let template = await response.text();
        console.log('✅ E-posta şablonu başarıyla yüklendi');
        
        template = template.replace(/\{\{USER_NAME\}\}/g, templateData.userName);
        template = template.replace(/\{\{USER_EMAIL\}\}/g, templateData.userEmail);
        template = template.replace(/\{\{VERIFICATION_URL\}\}/g, templateData.verificationUrl);
        template = template.replace(/\{\{CURRENT_YEAR\}\}/g, new Date().getFullYear());
        
        console.log('✅ Template placeholder\'ları işlendi');
        return template;
    } catch (error) {
        console.error('❌ Template yükleme hatası:', error);
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #03153d, #062a67); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; }
        .button { background: linear-gradient(45deg, #27ae60, #229954); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Hoş Geldiniz!</h1>
            <p>Tabledit'e katıldığınız için teşekkürler</p>
        </div>
        <div class="content">
            <h2>Merhaba ${templateData.userName}!</h2>
            <p><strong>${templateData.userEmail}</strong> adresli hesabınızla Tabledit'e kaydoldunuz.</p>
            <p>Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${templateData.verificationUrl}" class="button">✅ E-postamı Doğrula</a>
            </p>
            <p>Bu link 24 saat geçerlidir ve sadece bir kez kullanılabilir.</p>
        </div>
        <div class="footer">
            <p><strong>Tabledit</strong> - Modern Tablo Düzenleme Sistemi</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
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
            expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 saat
        };
        
        await setDoc(doc(db, 'emailVerificationTokens', token), tokenData);
        console.log('✅ Token Firestore\'a kaydedildi:', token.substring(0, 10) + '...');
        return token;
        
    } catch (error) {
        console.error('❌ Token oluşturma hatası:', error);
        throw error;
    }
}

export async function sendVerificationEmail(userId, email, name, token) {
    try {
        console.log('📧 Doğrulama e-postası gönderiliyor:', email);
        
        const baseUrl = window.location.origin;
        const verificationUrl = `${baseUrl}/tabledit/verify.html?token=${token}`;
        const templateData = {
            userName: name,
            userEmail: email,
            verificationUrl: verificationUrl
        };
        const emailHtml = await loadEmailTemplate(templateData);
        const emailText = createPlainTextEmail(name, email, verificationUrl);
        const emailData = {
            to: email,
            subject: 'Tabledit - E-posta Adresinizi Doğrulayın 🎉',
            html: emailHtml,
            text: emailText,
            userId: userId,
            token: token,
            templateUsed: 'verification-email',
            createdAt: new Date(),
            status: 'pending',
            attempts: 0,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                source: 'custom-email-system'
            }
        };
        
        const emailRef = await addDoc(collection(db, 'emailQueue'), emailData);
        console.log('✅ E-posta queue\'ya eklendi:', emailRef.id);
        await sendEmailViaClient(emailData);
        return {
            success: true,
            emailId: emailRef.id,
            token: token,
            verificationUrl: verificationUrl,
            templateUsed: 'verification-email'
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

async function sendEmailViaClient(emailData) {
    try {
        console.log('📨 Client-side e-posta gönderimi başlatılıyor...');
        
        
        console.log('📧 E-posta detayları:', {
            to: emailData.to,
            subject: emailData.subject,
            templateUsed: emailData.templateUsed,
            hasHtml: !!emailData.html,
            hasText: !!emailData.text,
            queueId: emailData.emailId
        });
        
        return { 
            success: true, 
            method: 'client-side-simulation',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.warn('⚠️ Client-side e-posta gönderme hatası:', error);
        return { 
            success: false, 
            error: error.message,
            fallback: 'firebase-functions'
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
        const templatePath = `./templates/${templateType}.html`;
        console.log(`📧 ${templateType} şablonu yükleniyor...`);
        const response = await fetch(templatePath);
        if (!response.ok) {
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
            templateUsed: result.templateUsed
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