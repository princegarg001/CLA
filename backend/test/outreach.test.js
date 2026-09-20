const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const config = require('../src/config');
const aiService = require('../src/services/aiService');
const mailService = require('../src/services/mailService');
const notificationService = require('../src/services/notificationService');
const outreach = require('../src/services/outreachService');

const NOW = new Date('2026-09-22T12:00:00.000Z').getTime(); // a Tuesday, noon UTC
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString();
config.defaultTimezone = 'UTC';
config.smtpUser = 'me@alphotech.com';

const DEFAULTS = outreach.DEFAULTS;

// ---- pure helpers ---------------------------------------------------------------------

test('templates fill known variables and leave unknown ones visible', () => {
  const out = outreach.renderTemplate('Hi {{first_name}} at {{company}} {{nope}}', { name: 'Dana Lee', company: 'Acme' });
  assert.equal(out, 'Hi Dana at Acme {{nope}}');
  assert.equal(outreach.renderTemplate('Hi {{first_name}}', { name: 'dana@acme.io' }), 'Hi there');
});

test('a leading "Subject:" line becomes the subject', () => {
  assert.deepEqual(outreach.splitSubject('Subject: Quick idea\n\nHello there'), { subject: 'Quick idea', body: 'Hello there' });
  assert.deepEqual(outreach.splitSubject('No subject line here'), { subject: null, body: 'No subject line here' });
});

test('the emailed text always carries the opt-out footer, signature and address', () => {
  const text = outreach.composeEmailText('Hello', { ...DEFAULTS, signature: 'Prince', postalAddress: '1 Main St' });
  assert.ok(text.startsWith('Hello'));
  assert.ok(text.includes('Prince'));
  assert.ok(text.includes('reply "no thanks"'));
  assert.ok(text.includes('1 Main St'));
});

test('follow-up schedule follows the settings and stops after the last step', () => {
  const s = { ...DEFAULTS, followupDays: [3, 7], maxFollowups: 2 };
  assert.equal(outreach.nextFollowupAt(iso(NOW), 0, s), iso(NOW + 3 * DAY));
  assert.equal(outreach.nextFollowupAt(iso(NOW), 1, s), iso(NOW + 7 * DAY));
  assert.equal(outreach.nextFollowupAt(iso(NOW), 2, s), null);
  assert.equal(outreach.nextFollowupAt(iso(NOW), 0, { ...s, maxFollowups: 0 }), null);
});

const sentMsg = (over = {}) => ({ id: 'm1', direction: 'outbound', status: 'sent', lead_id: 'L1', sent_at: iso(NOW - DAY), meta: {}, ...over });

test('sendCheck blocks bad addresses, suppressed addresses and the daily cap', () => {
  const lead = { id: 'L1', status: 'new' };
  assert.equal(outreach.sendCheck({ lead, to: 'nope', settings: DEFAULTS, now: NOW }).ok, false);
  const sup = outreach.sendCheck({ lead, to: 'a@b.co', settings: DEFAULTS, suppressed: ['A@B.co'], now: NOW });
  assert.match(sup.blockers[0], /do-not-contact/);
  const many = Array.from({ length: 3 }, (_, i) => sentMsg({ id: `x${i}`, lead_id: `other${i}`, sent_at: iso(NOW - 3600000) }));
  const cap = outreach.sendCheck({ lead, to: 'a@b.co', settings: { ...DEFAULTS, dailyCap: 3 }, messages: many, now: NOW });
  assert.match(cap.blockers[0], /Daily limit/);
});

test('emailing the same lead again is blocked unless forced, and follow-ups are exempt', () => {
  const lead = { id: 'L1', status: 'contacted' };
  const args = { lead, to: 'a@b.co', settings: DEFAULTS, messages: [sentMsg()], now: NOW };
  assert.equal(outreach.sendCheck(args).ok, false);
  assert.equal(outreach.sendCheck({ ...args, force: true }).ok, true);
  assert.equal(outreach.sendCheck({ ...args, isFollowup: true }).ok, true);
  // force never overrides the cap or suppression
  assert.equal(outreach.sendCheck({ ...args, force: true, suppressed: ['a@b.co'] }).ok, false);
});

test('auto follow-ups only send on weekday business hours', () => {
  assert.equal(outreach.inSendWindow(NOW, 'UTC'), true);
  assert.equal(outreach.inSendWindow(new Date('2026-09-22T03:00:00Z').getTime(), 'UTC'), false);
  assert.equal(outreach.inSendWindow(new Date('2026-09-26T12:00:00Z').getTime(), 'UTC'), false); // Saturday
});

// ---- mailbox parsing --------------------------------------------------------------------

test('stripQuoted keeps only what the person wrote', () => {
  const t = 'Sounds good, call Thursday?\n\nOn Mon, Sep 21, 2026 at 9:00 AM Me <me@x.com> wrote:\n> Hi there\n> quoted';
  assert.equal(mailService.stripQuoted(t), 'Sounds good, call Thursday?');
});

test('inbound mail is classified: bounce, auto-reply, unsubscribe, reply', () => {
  const c = mailService.classifyInbound;
  assert.equal(c({ from: 'mailer-daemon@googlemail.com', subject: 'Delivery Status Notification (Failure)' }), 'bounce');
  assert.equal(c({ from: 'a@b.co', subject: 'Out of office: back Monday' }), 'auto_reply');
  assert.equal(c({ from: 'a@b.co', subject: 'Re: hi', text: 'Please remove me from your list.' }), 'unsubscribe');
  assert.equal(c({ from: 'a@b.co', subject: 'Re: hi', text: 'Interesting, can you send pricing?' }), 'reply');
  assert.equal(c({ from: 'a@b.co', subject: 'Re: hi', text: `${'Thanks for reaching out. '.repeat(30)} unsubscribe` }), 'reply', 'a late mention is not a request');
  assert.equal(mailService.bouncedRecipient('Final-Recipient: rfc822; gone@nowhere.com'), 'gone@nowhere.com');
});

test('replies are matched by Message-ID first, then by sender address', () => {
  const out = [
    { id: 'a', sent_at: iso(NOW - 2 * DAY), meta: { messageId: '<a@x>', to: 'dana@acme.io' } },
    { id: 'b', sent_at: iso(NOW - DAY), meta: { messageId: '<b@x>', to: 'dana@acme.io' } },
    { id: 'c', sent_at: iso(NOW - DAY), meta: { messageId: '<c@x>', to: 'sam@other.io' } },
  ];
  assert.equal(outreach.matchInbound({ inReplyTo: '<a@x>', from: 'someone@else.io', kind: 'reply' }, out).id, 'a');
  assert.equal(outreach.matchInbound({ references: ['<c@x>'], from: 'x@y.z', kind: 'reply' }, out).id, 'c');
  assert.equal(outreach.matchInbound({ from: 'DANA@acme.io', kind: 'reply' }, out).id, 'b', 'newest to that address');
  assert.equal(outreach.matchInbound({ from: 'stranger@x.io', kind: 'reply' }, out), null);
  assert.equal(outreach.matchInbound({ from: 'mailer-daemon@x', kind: 'bounce', rawText: 'could not deliver <c@x>' }, out).id, 'c');
});

// ---- orchestration against an in-memory database -----------------------------------------

function fakeDb(t, { leads = [], messages = [], settings = {}, templates = [] } = {}) {
  const store = { leads: leads.map((l) => ({ ...l })), messages: messages.map((m) => ({ meta: {}, ...m })), settings: { ...settings }, templates };
  let n = 0;
  const table = (name) => (name === 'leads' ? store.leads : name === 'messages' ? store.messages : store.templates);
  t.mock.method(db, 'list', async (name) => table(name));
  t.mock.method(db, 'get', async (name, id) => table(name).find((r) => r.id === id) || null);
  t.mock.method(db, 'insert', async (name, row) => {
    const rec = { id: `${name[0]}${++n}`, created_at: iso(NOW + n * 1000), ...row };
    table(name).push(rec);
    return rec;
  });
  t.mock.method(db, 'update', async (name, id, patch) => {
    const arr = table(name);
    const i = arr.findIndex((r) => r.id === id);
    if (i < 0) return null;
    arr[i] = { ...arr[i], ...patch };
    return arr[i];
  });
  t.mock.method(db, 'remove', async (name, id) => {
    const arr = table(name);
    const i = arr.findIndex((r) => r.id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  t.mock.method(db, 'claim', async (name, id, { where, patch }) => {
    const r = table(name).find((x) => x.id === id);
    if (!r || Object.entries(where).some(([k, v]) => r[k] !== v)) return null;
    Object.assign(r, patch);
    return r;
  });
  t.mock.method(db, 'getSettings', async () => store.settings);
  t.mock.method(db, 'updateSettings', async (p) => Object.assign(store.settings, p));
  t.mock.method(aiService, 'safeComplete', async (_a, fb) => fb);
  t.mock.method(notificationService, 'sendPush', async () => ({}));
  t.mock.method(mailService, 'canSend', () => true);
  return store;
}

function fakeSmtp(t, { fail } = {}) {
  const sent = [];
  t.mock.method(mailService, 'send', async (mail) => {
    if (fail) throw new Error(fail);
    sent.push(mail);
    return { messageId: `<sent${sent.length}@alphotech.com>`, accepted: [mail.to] };
  });
  return sent;
}

const lead = (over = {}) => ({ id: 'L1', name: 'Dana Lee', company: 'Acme', email: 'dana@acme.io', status: 'new', ...over });
const draft = (over = {}) => ({ id: 'D1', lead_id: 'L1', channel: 'apollo_email', direction: 'outbound', status: 'draft', subject: 'Quick idea', body: 'Hello Dana, I can help.', ...over });

test('sending really goes through the mailbox, marks sent, contacts the lead and schedules a follow-up', async (t) => {
  const store = fakeDb(t, { leads: [lead()], messages: [draft()] });
  const sent = fakeSmtp(t);
  const { message } = await outreach.sendMessage('D1', { now: NOW });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'dana@acme.io');
  assert.ok(sent[0].text.includes('Hello Dana') && sent[0].text.includes('no thanks'));
  assert.equal(message.status, 'sent');
  assert.equal(message.meta.messageId, '<sent1@alphotech.com>');
  assert.equal(message.meta.nextFollowupAt, iso(NOW + 3 * DAY));
  assert.equal(store.leads[0].status, 'contacted');
});

test('a message cannot be sent twice, and failures are recorded and retryable', async (t) => {
  fakeDb(t, { leads: [lead()], messages: [draft()] });
  fakeSmtp(t);
  await outreach.sendMessage('D1', { now: NOW });
  await assert.rejects(outreach.sendMessage('D1', { now: NOW }), /already sent/);

  t.mock.restoreAll();
  const store2 = fakeDb(t, { leads: [lead()], messages: [draft()] });
  fakeSmtp(t, { fail: 'The mailbox rejected the login.' });
  await assert.rejects(outreach.sendMessage('D1', { now: NOW }), /rejected the login/);
  assert.equal(store2.messages[0].status, 'failed');
  assert.match(store2.messages[0].meta.lastError, /login/);
  assert.equal(store2.leads[0].status, 'new', 'lead is not marked contacted when the send failed');
});

test('channels CLA cannot send on are refused and point to "I sent it"', async (t) => {
  fakeDb(t, { leads: [lead()], messages: [draft({ channel: 'linkedin' })] });
  fakeSmtp(t);
  await assert.rejects(outreach.sendMessage('D1', { now: NOW }), /I sent it/);
});

test('the daily cap and a missing subject stop a send before anything leaves', async (t) => {
  const recent = Array.from({ length: 2 }, (_, i) => sentMsg({ id: `s${i}`, lead_id: `o${i}`, sent_at: iso(NOW - 1000) }));
  fakeDb(t, { leads: [lead()], messages: [draft(), ...recent], settings: { outreach: { dailyCap: 2 } } });
  const sent = fakeSmtp(t);
  await assert.rejects(outreach.sendMessage('D1', { now: NOW, force: true }), /Daily limit/);
  assert.equal(sent.length, 0);
  t.mock.restoreAll();
  fakeDb(t, { leads: [lead()], messages: [draft({ subject: '' })] });
  fakeSmtp(t);
  await assert.rejects(outreach.sendMessage('D1', { now: NOW }), /subject/);
});

test('markSent records a manual send and still schedules the reminder', async (t) => {
  const store = fakeDb(t, { leads: [lead()], messages: [draft({ channel: 'linkedin', subject: null })] });
  const m = await outreach.markSent('D1', { now: NOW });
  assert.equal(m.status, 'sent');
  assert.equal(m.meta.manual, true);
  assert.equal(m.meta.nextFollowupAt, iso(NOW + 3 * DAY));
  assert.equal(store.leads[0].status, 'contacted');
  assert.equal(outreach.sentInLast24h(store.messages, NOW), 0, 'manual sends do not use the mailbox cap');
});

test('follow-ups: due ones become drafts, replied leads stop, nothing double-drafts', async (t) => {
  const due = sentMsg({ id: 'S1', channel: 'apollo_email', subject: 'Quick idea', body: 'first', meta: { to: 'dana@acme.io', messageId: '<a@x>', threadId: 'S1', nextFollowupAt: iso(NOW - 1000) } });
  const stopped = sentMsg({ id: 'S2', lead_id: 'L2', channel: 'apollo_email', meta: { to: 'sam@o.io', messageId: '<b@x>', threadId: 'S2', nextFollowupAt: iso(NOW - 1000) } });
  const store = fakeDb(t, { leads: [lead(), lead({ id: 'L2', email: 'sam@o.io', status: 'replied' })], messages: [due, stopped] });
  const r = await outreach.runFollowups({ now: NOW });
  assert.equal(r.drafted, 1);
  const f = store.messages.find((m) => m.meta.followupOf === 'S1');
  assert.equal(f.status, 'draft');
  assert.equal(f.subject, 'Re: Quick idea');
  assert.equal(f.meta.followupStep, 1);
  assert.equal(f.meta.inReplyTo, '<a@x>');
  assert.equal(store.messages.find((m) => m.id === 'S1').meta.nextFollowupAt, null);
  assert.equal(store.messages.find((m) => m.id === 'S2').meta.nextFollowupAt, null, 'replied lead: sequence cancelled');
  assert.equal((await outreach.runFollowups({ now: NOW })).drafted, 0);
});

test('auto-send follow-ups sends them on business hours only when switched on', async (t) => {
  const due = sentMsg({ id: 'S1', channel: 'apollo_email', subject: 'Quick idea', meta: { to: 'dana@acme.io', messageId: '<a@x>', threadId: 'S1', nextFollowupAt: iso(NOW - 1000) } });
  const store = fakeDb(t, { leads: [lead({ status: 'contacted' })], messages: [due], settings: { outreach: { autoSendFollowups: true } } });
  const sent = fakeSmtp(t);
  const r = await outreach.runFollowups({ now: NOW });
  assert.equal(r.sent, 1);
  assert.equal(sent[0].inReplyTo, '<a@x>', 'sent inside the same thread');
  const f = store.messages.find((m) => m.meta.followupOf === 'S1');
  assert.equal(f.status, 'sent');
  assert.equal(f.meta.followupStep, 1);
  assert.equal(f.meta.nextFollowupAt, iso(NOW + 7 * DAY), 'second follow-up scheduled');
});

const inbound = (over = {}) => ({ messageId: '<in1@acme>', inReplyTo: '<a@x>', references: ['<a@x>'], from: 'dana@acme.io', subject: 'Re: Quick idea', text: 'Sounds interesting, can you send pricing?', rawText: 'Sounds interesting', date: iso(NOW - 3600000), kind: 'reply', ...over });
const outbound = () => sentMsg({ id: 'S1', channel: 'apollo_email', meta: { to: 'dana@acme.io', messageId: '<a@x>', threadId: 'S1', nextFollowupAt: iso(NOW + DAY) } });

test('a reply is attached to the thread, stops follow-ups and moves the lead to "replied"', async (t) => {
  t.mock.method(mailService, 'imapConfigured', () => true);
  const store = fakeDb(t, { leads: [lead({ status: 'contacted' })], messages: [outbound()] });
  const r = await outreach.syncReplies({ now: NOW, fetcher: async () => [inbound()] });
  assert.equal(r.replies, 1);
  const inb = store.messages.find((m) => m.direction === 'inbound');
  assert.equal(inb.body, 'Sounds interesting, can you send pricing?');
  assert.equal(inb.lead_id, 'L1');
  const out = store.messages.find((m) => m.id === 'S1');
  assert.equal(out.status, 'replied');
  assert.equal(out.meta.nextFollowupAt, null);
  assert.equal(store.leads[0].status, 'replied');
  // the same mail again changes nothing
  const again = await outreach.syncReplies({ now: NOW, fetcher: async () => [inbound()] });
  assert.equal(again.replies, 0);
  assert.equal(store.messages.filter((m) => m.direction === 'inbound').length, 1);
});

test('unsubscribe requests are honoured: suppressed, lead closed, never emailed again', async (t) => {
  t.mock.method(mailService, 'imapConfigured', () => true);
  const store = fakeDb(t, { leads: [lead({ status: 'contacted' })], messages: [outbound()] });
  const r = await outreach.syncReplies({ now: NOW, fetcher: async () => [inbound({ kind: 'unsubscribe', text: 'Please remove me.' })] });
  assert.equal(r.unsubscribes, 1);
  assert.deepEqual(store.settings.outreach_suppressed, ['dana@acme.io']);
  assert.equal(store.leads[0].status, 'closed_lost');
  const check = outreach.sendCheck({ lead: store.leads[0], to: 'dana@acme.io', settings: DEFAULTS, suppressed: store.settings.outreach_suppressed, now: NOW });
  assert.equal(check.ok, false);
});

test('bounces mark the send failed and suppress the address; unrelated mail and auto-replies are ignored', async (t) => {
  t.mock.method(mailService, 'imapConfigured', () => true);
  const store = fakeDb(t, { leads: [lead({ status: 'contacted' })], messages: [outbound()] });
  const mails = [
    inbound({ messageId: '<bounce@g>', kind: 'bounce', from: 'mailer-daemon@google.com', inReplyTo: null, references: [], rawText: 'Delivery failed for <a@x>' }),
    inbound({ messageId: '<news@x>', from: 'newsletter@shop.com', inReplyTo: null, references: [] }),
    inbound({ messageId: '<ooo@x>', kind: 'auto_reply' }),
  ];
  const r = await outreach.syncReplies({ now: NOW, fetcher: async () => mails });
  assert.equal(r.bounces, 1);
  assert.equal(r.replies, 0);
  assert.equal(store.messages.find((m) => m.id === 'S1').status, 'failed');
  assert.equal(store.messages.find((m) => m.id === 'S1').meta.bounced, true);
  assert.deepEqual(store.settings.outreach_suppressed, ['dana@acme.io']);
  assert.equal(store.messages.filter((m) => m.direction === 'inbound').length, 0);
});

test('without a mailbox login, reply sync says so instead of pretending', async (t) => {
  fakeDb(t);
  t.mock.method(mailService, 'imapConfigured', () => false);
  const r = await outreach.syncReplies({ now: NOW, fetcher: async () => assert.fail('must not fetch') });
  assert.match(r.skipped, /not set up/);
});

test('stats and threads reflect real activity only', async (t) => {
  t.mock.method(mailService, 'imapConfigured', () => true);
  fakeDb(t, { leads: [lead({ status: 'contacted' }), lead({ id: 'L2', name: 'Sam', email: 'sam@o.io', status: 'contacted' })], messages: [outbound(), sentMsg({ id: 'S9', lead_id: 'L2', meta: { to: 'sam@o.io', messageId: '<z@x>' } })] });
  await outreach.syncReplies({ now: NOW, fetcher: async () => [inbound()] });
  const o = await outreach.overview();
  assert.equal(o.stats.peopleContacted, 2);
  assert.equal(o.stats.replies, 1);
  assert.equal(o.stats.replyRate, 50);
  const thread = o.threads.find((th) => th.lead.id === 'L1');
  assert.equal(thread.awaitingYou, true);
  assert.equal(thread.messages.length, 2);
  assert.equal(o.threads.find((th) => th.lead.id === 'L2').awaitingYou, false);
});

test('email drafting parses the SUBJECT/BODY format and falls back to a real template without AI', async (t) => {
  fakeDb(t);
  assert.deepEqual(outreach.parseEmailDraft('SUBJECT: A quick idea\nBODY: Hi Dana, I noticed Acme is hiring backend engineers and I can help with a fixed-scope project.'), {
    subject: 'A quick idea',
    body: 'Hi Dana, I noticed Acme is hiring backend engineers and I can help with a fixed-scope project.',
  });
  assert.equal(outreach.parseEmailDraft('nonsense'), null);
  const d = await outreach.draftEmail({ lead: lead() });
  assert.equal(d.ai, false);
  assert.ok(d.body.includes('Hi Dana') && d.body.includes('Acme'));
  assert.ok(!d.body.includes('{{'));
});

test('IMAP host is derived for the common providers, including GoDaddy', () => {
  const g = mailService.guessImapHost;
  assert.equal(g('smtp.gmail.com'), 'imap.gmail.com');
  assert.equal(g('smtp.titan.email'), 'imap.titan.email');
  assert.equal(g('smtpout.secureserver.net'), 'imap.secureserver.net');
  assert.equal(g('smtp.office365.com'), 'outlook.office365.com');
  assert.equal(g('smtp.zoho.com'), 'imap.zoho.com');
});

test('a connection timeout is explained, and on Render it names the blocked SMTP ports', () => {
  const err = Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
  const before = process.env.RENDER;
  delete process.env.RENDER;
  assert.match(mailService.friendlySmtpError(err), /Could not reach the mail server/);
  process.env.RENDER = 'true';
  assert.match(mailService.friendlySmtpError(err), /free plan blocks outbound email ports/);
  if (before === undefined) delete process.env.RENDER; else process.env.RENDER = before;
  assert.match(mailService.friendlySmtpError(new Error('535 Authentication failed')), /rejected the login/);
});

test('with an email API key, mail is sent over HTTPS (not SMTP) and the request is well formed', async (t) => {
  config.resendApiKey = 're_test';
  config.smtpFromName = 'Prince from AlphoTech';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'resend-123' }) };
  });
  try {
    assert.equal(mailService.apiProvider(), 'resend');
    assert.equal(mailService.canSend(), true);
    const r = await mailService.send({ to: 'dana@acme.io', subject: 'Quick idea', text: 'Hello', inReplyTo: '<a@x>', references: ['<a@x>'] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
    const b = calls[0].body;
    assert.equal(b.from, '"Prince from AlphoTech" <me@alphotech.com>');
    assert.deepEqual(b.to, ['dana@acme.io']);
    assert.equal(b.reply_to, 'me@alphotech.com', 'replies come back to the mailbox that is read over IMAP');
    assert.match(b.headers['List-Unsubscribe'], /unsubscribe/);
    assert.equal(b.headers['In-Reply-To'], '<a@x>');
    assert.equal(r.providerId, 'resend-123');
    assert.match(r.messageId, /^<.+@alphotech\.com>$/);
  } finally {
    config.resendApiKey = '';
    config.smtpFromName = '';
  }
});

test('email API failures are explained in plain words', async (t) => {
  config.resendApiKey = 're_bad';
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403, json: async () => ({ message: 'The alphotech.com domain is not verified' }) }));
  try {
    await assert.rejects(mailService.send({ to: 'dana@acme.io', subject: 's', text: 't' }), /Resend rejected the API key.*not verified/s);
    t.mock.restoreAll();
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 422, json: async () => ({ message: 'Invalid from address' }) }));
    await assert.rejects(mailService.send({ to: 'dana@acme.io', subject: 's', text: 't' }), /verified sender/);
  } finally {
    config.resendApiKey = '';
  }
});

test('Brevo is used when only its key is set, and verify() checks the key without sending', async (t) => {
  config.brevoApiKey = 'xkeysib-test';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, method: init.method });
    return { ok: true, status: 200, json: async () => ({ messageId: '<brevo@x>', email: 'me@alphotech.com' }) };
  });
  try {
    assert.equal(mailService.apiProvider(), 'brevo');
    const v = await mailService.verify();
    assert.equal(v.smtp.ok, true);
    assert.equal(v.smtp.via, 'brevo');
    assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), ['GET https://api.brevo.com/v3/account']);
    await mailService.send({ to: 'dana@acme.io', subject: 's', text: 't' });
    assert.equal(calls[1].url, 'https://api.brevo.com/v3/smtp/email');
  } finally {
    config.brevoApiKey = '';
  }
});

test('a refused IMAP login shows the server\'s own words instead of "Command failed"', () => {
  config.imapHost = 'imap.titan.email';
  config.smtpUser = 'support@alphotech.com';
  const refused = Object.assign(new Error('Command failed'), { authenticationFailed: true, responseText: 'Authentication failed.' });
  const msg = mailService.friendlyImapError(refused);
  assert.match(msg, /support@alphotech\.com/);
  assert.match(msg, /Authentication failed\./);
  assert.match(msg, /app password|IMAP access is enabled/);
  assert.match(mailService.friendlyImapError(Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' })), /Could not connect to imap\.titan\.email:993/);
  config.imapHost = '';
  config.smtpUser = 'me@alphotech.com';
});
