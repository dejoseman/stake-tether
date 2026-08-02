const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1. Create a transporter
    // For development, we will just log the email contents if SMTP isn't configured.
    // In production, the user will provide EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n--- EMAIL MOCK (SMTP not configured) ---');
      console.log(`To: ${options.email}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Message: \n${options.message}`);
      console.log('----------------------------------------\n');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define the email options
    const mailOptions = {
      from: `Tether Staking <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      // You can also add html: options.html here if you want rich emails
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error('Email could not be sent:', error.message);
  }
};

module.exports = sendEmail;
