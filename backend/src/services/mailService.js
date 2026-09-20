const { randomUUID } = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

// Real email for outreach: send through the founder's own mailbox (SMTP) and read the same
// mailbox (IMAP) to detect replies, bounces and unsubscribes. Nothing here is simulated: when
// the mailbox is not configured every function says so instead of pretending.

// ---- configuration --------------------------------------------------------------

function guessImapHost(smtpHost = '') {
  if (/office365|outlook/i.test(smtpHost)) return 'outlook.office365.com';
  // GoDaddy Workspace Email sends via smtpout.secureserver.net but is read via imap.secureserver.net.
  if (/secureserver.net/i.test(smtpHost)) return 'imap.secureserver.net';
  return smtpHost.replace(/^smtp\./i, 'imap.');
}

function smtpConfigured() {
  return config.isConfigured('smtp');
}

// Which way mail leaves: an HTTPS email API when a key is set (works where SMTP ports are
// blocked, e.g. Render's free plan), otherwise plain SMTP.
function apiProvider() {
  if (config.resendApiKey) return 'resend';
  if (config.brevoApiKey) return 'brevo';
  return null;
}

const fromAddress = () => config.mailFrom || config.smtpUser;

// True when a message can actually be sent right now.
function canSend() {
  return !!(fromAddress() && (apiProvider() || smtpConfigured()));
}

function imapSettings() {
  return {
    host: config.imapHost || guessImapHost(config.smtpHost),
    port: config.imapPort || 993,
    user: config.imapUser || config.smtpUser,
    pass: config.imapPass || config.smtpPass,
  };
}

function imapConfigured() {
  const s = imapSettings();
  return !!(s.host && s.user && s.pass);
}

const fromName = () => (config.smtpFromName || '').replace(/["<>\r\n]/g, '');
const fromHeader = () => (fromName() ? `"${fromName()}" <${fromAddress()}>` : fromAddress());

// ---- sending --------------------------------------------------------------------

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }
  return transporter;
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
const isEmail = (v) => EMAIL_RE.test(String(v || '').trim());

async function callApi(url, { method = 'POST', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  return { ok: res.ok, status: res.status, json };
}

function apiError(provider, r) {
  const detail = (r.json && (r.json.message || r.json.error || r.json.code)) || `HTTP ${r.status}`;
  if (r.status === 401 || r.status === 403) return `${provider} rejected the API key (${detail}). Check ${provider === 'Resend' ? 'RESEND_API_KEY' : 'BREVO_API_KEY'} and that your sending domain or address is verified there.`;
  if (r.status === 422 || r.status === 400) return `${provider} refused the message: ${detail}. Make sure ${fromAddress()} is a verified sender in ${provider}.`;
  return `${provider} error: ${detail}`;
}

async function sendViaApi({ to, subject, text, inReplyTo, references, messageId }) {
  const headers = { 'List-Unsubscribe': `<mailto:${fromAddress()}?subject=unsubscribe>` };
  if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
  if (references && references.length) headers.References = references.join(' ');

  if (apiProvider() === 'resend') {
    const r = await callApi('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${config.resendApiKey}` },
      body: { from: fromHeader(), to: [to], subject, text, reply_to: fromAddress(), headers },
    });
    if (!r.ok) throw Object.assign(new Error(apiError('Resend', r)), { status: 502 });
    return { messageId: (r.json && r.json.id) || messageId };
  }
  const r = await callApi('https://api.brevo.com/v3/smtp/email', {
    headers: { 'api-key': config.brevoApiKey, accept: 'application/json' },
    body: { sender: { name: fromName() || undefined, email: fromAddress() }, to: [{ email: to }], subject, textContent: text, replyTo: { email: fromAddress() }, headers },
  });
  if (!r.ok) throw Object.assign(new Error(apiError('Brevo', r)), { status: 502 });
  return { messageId: (r.json && r.json.messageId) || messageId };
}

// Sends one plain-text email. The Message-ID is created here (not by the server) so it is
// known before delivery and can be matched against replies later. When an email API is used the
// provider assigns its own header, so replies are matched by sender address instead.
async function send({ to, subject, text, inReplyTo, references }) {
  if (!canSend()) throw Object.assign(new Error('Email is not set up. Add RESEND_API_KEY (or SMTP_HOST, SMTP_USER and SMTP_PASS) on the server.'), { status: 503 });
  if (!isEmail(to)) throw Object.assign(new Error(`"${to}" is not a valid email address`), { status: 400 });
  const domain = (fromAddress().split('@')[1] || 'localhost').toLowerCase();
  const messageId = `<${randomUUID()}@${domain}>`;
  try {
    if (apiProvider()) {
      const out = await sendViaApi({ to, subject, text, inReplyTo, references, messageId });
      return { messageId, providerId: out.messageId, accepted: [to] };
    }
    const info = await getTransporter().sendMail({
      from: fromHeader(),
      to,
      subject,
      text,
      messageId,
      inReplyTo: inReplyTo || undefined,
      references: references && references.length ? references : inReplyTo || undefined,
      headers: { 'List-Unsubscribe': `<mailto:${fromAddress()}?subject=unsubscribe>` },
    });
    if (info.rejected && info.rejected.length) throw new Error(`The server rejected ${info.rejected.join(', ')}`);
    return { messageId, accepted: info.accepted || [to] };
  } catch (e) {
    logger.error('mailService.send failed', { error: e.message });
    throw Object.assign(new Error(friendlySmtpError(e)), { status: e.status || 502 });
  }
}

function friendlySmtpError(e) {
  const m = String(e.message || e);
  if (/535|Invalid login|Username and Password not accepted|AUTH/i.test(m)) return 'The mailbox rejected the login. For Gmail use an App Password, not your normal password.';
  if (/^(ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNECTION|ESOCKET|EDNS)$/.test(e.code || '') || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(m)) {
    const where = `${config.smtpHost}:${config.smtpPort}`;
    // Render's free plan blocks outbound SMTP (25, 465, 587), which looks exactly like a timeout.
    if (process.env.RENDER) return `Could not connect to the mail server (${where}). Render's free plan blocks outbound email ports 25, 465 and 587. Send through an email API instead: set RESEND_API_KEY on Render.`;
    return `Could not reach the mail server (${where}). Check SMTP_HOST and SMTP_PORT.`;
  }
  return m;
}

// ---- reading --------------------------------------------------------------------

// Drops the quoted history so only what the person actually wrote is kept.
function stripQuoted(text = '') {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .{5,200}wrote:\s*$/i.test(line)) break;
    if (/^\s*-{2,}\s*(Original Message|Forwarded message)/i.test(line)) break;
    if (/^\s*From:\s.+/i.test(line) && out.length > 0 && /^\s*$/.test(out[out.length - 1])) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

const BOUNCE_FROM_RE = /(mailer-daemon|postmaster|mail delivery subsystem)/i;
const BOUNCE_SUBJECT_RE = /(undeliver|delivery status notification|delivery failure|returned mail|failure notice|couldn'?t be delivered|address not found)/i;
const AUTO_SUBJECT_RE = /(out of office|automatic reply|auto[- ]?reply|autoreply|vacation|away from)/i;
const UNSUBSCRIBE_RE = /\b(unsubscribe|remove me|take me off|stop (emailing|contacting|sending)|do not (email|contact)|don'?t (email|contact)|not interested|no thanks|no thank you)\b/i;

// bounce | auto_reply | unsubscribe | reply
function classifyInbound({ from = '', subject = '', text = '', autoSubmitted = '' }) {
  if (BOUNCE_FROM_RE.test(from) || BOUNCE_SUBJECT_RE.test(subject)) return 'bounce';
  if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') || AUTO_SUBJECT_RE.test(subject)) return 'auto_reply';
  // Only the first lines count: a signature or a long thread quoting "unsubscribe" is not a request.
  if (UNSUBSCRIBE_RE.test(String(text).split('\n').slice(0, 6).join(' ').slice(0, 400))) return 'unsubscribe';
  return 'reply';
}

// The address a bounce is about (the one we sent to), when the notice names it.
function bouncedRecipient(text = '') {
  const m = /(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*([^\s>]+)/i.exec(text) || /(?:to|for|address)\s*[:<]?\s*<?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>?/i.exec(text);
  return m ? m[1].toLowerCase() : null;
}

const addrOf = (v) => {
  const a = v && v.value && v.value[0];
  return a && a.address ? a.address.toLowerCase() : '';
};

async function fetchInbound({ since, limit = 200 } = {}) {
  if (!imapConfigured()) return [];
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');
  const s = imapSettings();
  const client = new ImapFlow({ host: s.host, port: s.port, secure: s.port === 993, auth: { user: s.user, pass: s.pass }, logger: false });
  client.on('error', (e) => logger.warn('mailService: imap error', { error: e.message }));
  const out = [];
  try {
    await client.connect();
  } catch (e) {
    throw Object.assign(new Error(friendlyImapError(e)), { status: 502 });
  }
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ since: since || new Date(Date.now() - 3 * 86400000) }, { uid: true });
      for (const uid of (uids || []).slice(-limit)) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const p = await simpleParser(msg.source);
        const from = addrOf(p.from);
        const subject = p.subject || '';
        const bodyText = p.text || '';
        const references = Array.isArray(p.references) ? p.references : p.references ? [p.references] : [];
        out.push({
          messageId: p.messageId || null,
          inReplyTo: p.inReplyTo || null,
          references,
          from,
          subject,
          text: stripQuoted(bodyText),
          rawText: bodyText.slice(0, 4000),
          date: (p.date || new Date()).toISOString(),
          kind: classifyInbound({ from, subject, text: stripQuoted(bodyText), autoSubmitted: p.headers && p.headers.get('auto-submitted') ? String(p.headers.get('auto-submitted')) : '' }),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return out;
}

// imapflow reports a refused login as just "Command failed"; the server's own words are in
// responseText, and those are what say whether it is the password, a disabled IMAP setting, etc.
function friendlyImapError(e) {
  const server = [e.responseText, e.serverResponseCode].filter(Boolean).join(' ').trim();
  const s = imapSettings();
  if (e.authenticationFailed || /AUTH|credentials|Invalid|LOGIN|password/i.test(`${server} ${e.message}`)) {
    return `The mailbox rejected the login for ${s.user}${server ? ` ("${server}")` : ''}. Check that SMTP_PASS is this mailbox's password (an app password if two-factor is on) and that IMAP access is enabled for the mailbox.`;
  }
  if (/^(ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EDNS)$/.test(e.code || '') || /timeout|ENOTFOUND|ECONNREFUSED/i.test(e.message)) {
    return `Could not connect to ${s.host}:${s.port}. Check IMAP_HOST and IMAP_PORT.`;
  }
  return `${e.message}${server ? ` (${server})` : ''}`;
}

// Checks the two connections separately so the setup screen can say which one is wrong.
async function verify() {
  const result = {
    smtp: { configured: canSend(), ok: false, error: null, via: apiProvider() || 'smtp' },
    imap: { configured: imapConfigured(), ok: false, error: null },
  };
  if (result.smtp.configured && apiProvider()) {
    // Checks the key without sending anything. A "restricted" Resend key cannot list domains, which
    // still proves the key is valid, so that particular refusal counts as OK.
    try {
      const r =
        apiProvider() === 'resend'
          ? await callApi('https://api.resend.com/domains', { method: 'GET', headers: { Authorization: `Bearer ${config.resendApiKey}` } })
          : await callApi('https://api.brevo.com/v3/account', { method: 'GET', headers: { 'api-key': config.brevoApiKey, accept: 'application/json' } });
      const restricted = r.status === 401 && r.json && r.json.name === 'restricted_api_key';
      if (r.ok || restricted) result.smtp.ok = true;
      else result.smtp.error = apiError(apiProvider() === 'resend' ? 'Resend' : 'Brevo', r);
    } catch (e) {
      result.smtp.error = `Could not reach the email service: ${e.message}`;
    }
  } else if (result.smtp.configured) {
    try {
      transporter = null;
      await getTransporter().verify();
      result.smtp.ok = true;
    } catch (e) {
      result.smtp.error = friendlySmtpError(e);
    }
  }
  if (result.imap.configured) {
    try {
      const { ImapFlow } = require('imapflow');
      const s = imapSettings();
      const client = new ImapFlow({ host: s.host, port: s.port, secure: s.port === 993, auth: { user: s.user, pass: s.pass }, logger: false });
      client.on('error', () => {});
      await client.connect();
      await client.logout();
      result.imap.ok = true;
    } catch (e) {
      result.imap.error = friendlyImapError(e);
    }
  }
  return result;
}

function status() {
  return {
    smtp: { configured: canSend(), from: canSend() ? fromAddress() : null, via: apiProvider() || 'smtp' },
    imap: { configured: imapConfigured(), host: imapConfigured() ? imapSettings().host : null },
  };
}

module.exports = { friendlyImapError, friendlySmtpError, apiProvider, canSend, send, fetchInbound, verify, status, smtpConfigured, imapConfigured, isEmail, stripQuoted, classifyInbound, bouncedRecipient, guessImapHost, fromAddress };
