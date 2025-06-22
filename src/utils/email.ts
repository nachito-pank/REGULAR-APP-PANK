import emailjs from '@emailjs/browser';
// Email verification utilities with real email service integration
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Configuration for different email services
interface EmailConfig {
  service: 'resend' | 'sendgrid' | 'mailgun' | 'nodemailer' | 'emailjs';
  apiKey?: string;
  domain?: string;
  fromEmail: string;
  fromName: string;
}

// Get email configuration from environment variables
const getEmailConfig = (): EmailConfig => {
  const service = import.meta.env.VITE_EMAIL_SERVICE as EmailConfig['service'] || 'demo';
  
  return {
    service,
    apiKey: import.meta.env.VITE_EMAIL_API_KEY,
    domain: import.meta.env.VITE_EMAIL_DOMAIN,
    fromEmail: import.meta.env.VITE_FROM_EMAIL || 'noreply@pank.com',
    fromName: import.meta.env.VITE_FROM_NAME || 'PANK - Gestion des présences'
  };
};

// Email template for verification
const getVerificationEmailTemplate = (code: string, companyName?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code de vérification PANK</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">PANK</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 16px;">Gestion des présences et rapports</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">Vérification de votre email</h2>
            <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.5;">
              Bienvenue ${companyName ? `chez <strong>${companyName}</strong>` : 'sur PANK'} ! <br>
              Votre code de vérification est :
            </p>
          </div>
          
          <!-- Verification Code -->
          <div style="background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: 'Courier New', monospace; margin-bottom: 16px;">
              ${code}
            </div>
            <p style="color: #ef4444; font-size: 14px; margin: 0; font-weight: 500;">
              ⏰ Ce code expire dans 10 minutes
            </p>
          </div>
          
          <!-- Instructions -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">📋 Instructions :</h3>
            <ol style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>Retournez sur la page de vérification</li>
              <li>Saisissez le code à 6 chiffres ci-dessus</li>
              <li>Cliquez sur "Vérifier" pour activer votre compte</li>
            </ol>
          </div>
          
          <!-- Security Notice -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <p style="color: #dc2626; font-size: 14px; margin: 0; line-height: 1.5;">
              <strong>🔒 Sécurité :</strong> Si vous n'avez pas demandé ce code, ignorez cet email. 
              Ne partagez jamais votre code de vérification avec qui que ce soit.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
            Besoin d'aide ? Contactez notre support technique
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2024 PANK - Système de gestion des présences et rapports
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// 1. RESEND (Recommandé - Simple et fiable)
const sendEmailWithResend = async (to: string, code: string, companyName?: string): Promise<void> => {
  const config = getEmailConfig();
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      subject: `Code de vérification PANK${companyName ? ` - ${companyName}` : ''}`,
      html: getVerificationEmailTemplate(code, companyName),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Resend: ${error}`);
  }
};

// 2. SENDGRID
const sendEmailWithSendGrid = async (to: string, code: string, companyName?: string): Promise<void> => {
  const config = getEmailConfig();
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: to }],
        subject: `Code de vérification PANK${companyName ? ` - ${companyName}` : ''}`,
      }],
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      content: [{
        type: 'text/html',
        value: getVerificationEmailTemplate(code, companyName),
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur SendGrid: ${error}`);
  }
};

// 3. MAILGUN
const sendEmailWithMailgun = async (to: string, code: string, companyName?: string): Promise<void> => {
  const config = getEmailConfig();
  
  const formData = new FormData();
  formData.append('from', `${config.fromName} <${config.fromEmail}>`);
  formData.append('to', to);
  formData.append('subject', `Code de vérification PANK${companyName ? ` - ${companyName}` : ''}`);
  formData.append('html', getVerificationEmailTemplate(code, companyName));

  const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${config.apiKey}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Mailgun: ${error}`);
  }
};

// 4. EMAILJS (Frontend uniquement - Gratuit)
const sendEmailWithEmailJS = async (to: string, code: string, companyName?: string): Promise<void> => {
  // Vous devez d'abord installer EmailJS: npm install @emailjs/browser
  
  
  const templateParams = {
    to_email: to,
    to_name: to.split('@')[0],
    verification_code: code,
    company_name: companyName || 'PANK',
    from_name: 'PANK - Gestion des présences',
  };

  // Configuration EmailJS (à remplacer par vos vraies clés)
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  await emailjs.send(serviceId, templateId, templateParams, publicKey);
};

// Main function to send verification email
export const sendVerificationEmail = async (email: string, code: string, companyName?: string): Promise<void> => {
  const config = getEmailConfig();
  
  console.log(`📧 Sending verification email to ${email}`);
  console.log(`🔐 Verification code: ${code}`);
  console.log(`🏢 Company: ${companyName || 'PANK'}`);
  
  try {
    switch (config.service) {
      case 'resend':
        await sendEmailWithResend(email, code, companyName);
        break;
      case 'sendgrid':
        await sendEmailWithSendGrid(email, code, companyName);
        break;
      case 'mailgun':
        await sendEmailWithMailgun(email, code, companyName);
        break;
      case 'emailjs':
        await sendEmailWithEmailJS(email, code, companyName);
        break;
      default:
        // Mode démo - affiche dans la console et notification
        console.log('📧 MODE DÉMO - Email non envoyé réellement');
        
        // Show browser notification for demo
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Code de vérification PANK', {
            body: `Votre code de vérification est: ${code}`,
            icon: '/favicon.ico'
          });
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
    }
    
    console.log('✅ Email envoyé avec succès via', config.service);
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw new Error(`Impossible d'envoyer l'email de vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

// Request notification permission on app load
export const requestNotificationPermission = async (): Promise<void> => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};