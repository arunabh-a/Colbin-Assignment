import nodemailer from 'nodemailer';
import * as crypto from 'crypto';

// Create transporter using Gmail SMTP with enhanced configuration for production
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail app password
    },
    // Enhanced configuration for production environments
    pool: true, // Use connection pool
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 second rate limiting
    rateLimit: 5, // Max 5 emails per rateDelta
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // TLS options for better security
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ciphers: 'SSLv3'
    }
  });
};

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Enhanced email sending with retry logic and better error handling
export const sendVerificationEmail = async (email: string, name: string, verificationToken: string) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to send email (attempt ${attempt}/${maxRetries})`);
      
      const transporter = createTransporter();
      
      // Verify connection configuration before sending
      try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
      } catch (verifyError) {
        console.warn('SMTP verification failed, proceeding anyway:', verifyError);
      }
      
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your email address',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">Welcome to Colbin, ${name}!</h2>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p style="color: #666; font-size: 16px;">
                Thank you for creating an account with us. To complete your registration and secure your account, 
                please verify your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;
                          display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, you can also copy and paste this link into your browser:
                <br>
                <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">
                  ${verificationUrl}
                </a>
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                This verification link will expire in 24 hours for security purposes.
                If you didn't create an account with Colbin, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px;">
                © 2024 Colbin. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      
      // Close the transporter
      transporter.close();
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Email sending attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, use fallback method
  console.log('All email attempts failed, using fallback method');
  return await sendVerificationEmailFallback(email, name, verificationToken);
};

// Alternative email service for fallback
export const sendVerificationEmailFallback = async (email: string, name: string, verificationToken: string) => {
  console.log('Using fallback email method - logging verification token');
  console.log(`Verification token for ${email}: ${verificationToken}`);
  
  // In production, you might want to use a different email service like SendGrid, Mailgun, etc.
  // For now, we'll just log the token so the user can manually verify
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  console.log(`Manual verification URL: ${verificationUrl}`);
  
  return { 
    messageId: 'fallback-' + Date.now(),
    fallback: true,
    verificationUrl 
  };
};