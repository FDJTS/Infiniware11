const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure transporter
const transporter = nodemailer.createTransport({
    // Using a placeholder configuration. User will need to update this in .env
    host: process.env.SMTP_HOST || 'smtp.infiniware.bid',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'no-reply@infiniware.bid',
        pass: process.env.SMTP_PASS || 'password'
    }
});

const AUTH_TEMPLATE_PATH = path.join(__dirname, 'auth-template.html');

function getTemplate(title, content, extra = '') {
    let template = fs.readFileSync(AUTH_TEMPLATE_PATH, 'utf8');
    template = template.replace('Security Verification', title);
    template = template.replace('<p>Greetings,</p>', `<p>Greetings,</p>${content}`);
    // Remove the code box placeholder if not needed
    if (!extra) {
        template = template.replace(/<!-- CODE BOX -->[\s\S]*?<\/div>/, '');
    } else {
        template = template.replace('682 - 401', extra);
    }
    return template;
}

async function sendVerificationEmail(email, token) {
    const url = `${process.env.BASE_URL || 'https://infiniware.bid'}/api/v1/auth/verify?token=${token}`;
    const content = `<p>Welcome to the Infiniware ecosystem. To ensure the structural integrity of your account, please verify your email address by clicking the link below:</p>
    <p><a href="${url}" style="color: #E31E24; text-decoration: none; font-weight: bold;">Verify Structural Identity</a></p>
    <p>If the link doesn't work, copy and paste this into your browser: ${url}</p>`;

    const html = getTemplate('Structural Verification', content);

    await transporter.sendMail({
        from: '"Infiniware Operations" <no-reply@infiniware.bid>',
        to: email,
        subject: 'Infiniware: Structural Verification Required',
        html
    });
}

async function sendWelcomeEmail(email, username) {
    const content = `<p>Your account has been successfully initialized and verified.</p>
    <p>You are now part of the Infiniware community, a space dedicated to human-made software and technical growth. Feel free to share your thoughts, projects, and structural insights in the community feed.</p>`;

    const html = getTemplate('Welcome to the Infrastructure', content);

    await transporter.sendMail({
        from: '"Infiniware Operations" <no-reply@infiniware.bid>',
        to: email,
        subject: 'Welcome to Infiniware',
        html
    });
}

module.exports = { sendVerificationEmail, sendWelcomeEmail };
