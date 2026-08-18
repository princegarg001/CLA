const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
  }
  return transporter;
}

// Used for War Room push-style alerts (hot lead, site down, traffic spike) when SMTP is configured.
// Falls back to a log line so the app never breaks in dev without SMTP set up.
async function sendAlert(subject, text) {
  if (!config.isConfigured('smtp') || !config.alertEmailTo) {
    logger.info(`emailService: SMTP not configured — alert logged only: ${subject}`);
    return { sent: false, sample: true };
  }
  try {
    await getTransporter().sendMail({
      from: config.smtpUser,
      to: config.alertEmailTo,
      subject: `[CLA] ${subject}`,
      text,
    });
    return { sent: true };
  } catch (e) {
    logger.error('emailService.sendAlert failed', { error: e.message });
    return { sent: false, error: e.message };
  }
}

// Minimal parser for inbound job-alert emails (SolidGigs / Contra forwarding) — extracts
// the fields the routes need. Real parsing rules should be tuned once real forwarded
// emails are seen; this keeps a predictable shape either way.
function parseInboundJobEmail(payload = {}) {
  const subject = payload.subject || '';
  const text = payload.text || payload.html || '';
  return {
    subject,
    body: text,
    from: payload.from || '',
    receivedAt: new Date().toISOString(),
  };
}

module.exports = { sendAlert, parseInboundJobEmail };
