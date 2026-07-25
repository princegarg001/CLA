const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');
const axios = require('axios');

// Services (simple inline stubs) — each will check config and either proxy or return sample data

// Leads (Supabase optional / local fallback)
router.get('/leads', async (req, res) => {
  // If SUPABASE is configured, explain where to add integration (not implemented yet)
  if (config.supabaseUrl && config.supabaseKey) {
    return res.json({ ok: false, message: 'Supabase configured in .env, but Supabase client wiring not implemented in this scaffold. Fill in or remove SUPABASE_* to use local DB.' });
  }
  const leads = db.getLeads();
  res.json({ ok: true, data: leads });
});

router.post('/leads', (req, res) => {
  const lead = req.body;
  const saved = db.addLead(Object.assign({ createdAt: new Date().toISOString() }, lead));
  res.json({ ok: true, data: saved });
});

// Settings
router.get('/settings', (req, res) => {
  const s = db.getSettings();
  res.json({ ok: true, data: s, integrations: {
    apollo: !!config.apolloApiKey,
    umami: !!config.umamiToken && !!config.umamiSiteId,
    sentry: !!config.sentryDsn,
    twitter: !!config.twitterBearer,
    trustmrr: !!config.trustmrrKey,
    gumroad: !!config.gumroadClientId,
    betalist: !!config.betalistRss,
    solidgigs: !!config.solidgigsEmail,
    contra: !!config.contraEmail,
    agentscope: !!config.agentscopeKey,
    verdent: !!config.verdentKey,
    gro: !!config.groSecret,
    headai: !!config.headaiKey,
    webrobots: !!config.webrobotsKey,
    startupsRip: !!config.startupsRipRss,
  }});
});

router.post('/settings', (req, res) => {
  const s = db.updateSettings(req.body);
  res.json({ ok: true, data: s });
});

// Apollo search stub
router.get('/apollo/search', async (req, res) => {
  const q = req.query.q || 'ctos fintech';
  if (!config.apolloApiKey || !config.apolloBaseUrl) {
    // return sample data
    return res.json({ ok: true, data: [
      { name: 'David Chen', role: 'CTO', company: 'Finova Technologies', email: 'david@finova.example' },
      { name: 'Sarah Williams', role: 'VP Engineering', company: 'BuildFast', email: 'sarah@buildfast.example' },
    ]});
  }
  try {
    const r = await axios.get(`${config.apolloBaseUrl}/search`, {
      headers: { Authorization: `Bearer ${config.apolloApiKey}` },
      params: { q }
    });
    res.json({ ok: true, data: r.data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Umami stats stub
router.get('/umami/stats', async (req, res) => {
  if (!config.umamiToken || !config.umamiSiteId) {
    return res.json({ ok: true, data: { pageviews: 87, visitors: 543, topSources: [{ name: 'Google', pct: 34 }, { name: 'Twitter', pct: 28 }] } });
  }
  try {
    const r = await axios.get(`https://analytics.umami.is/api/collect/traffic?site_id=${config.umamiSiteId}`, {
      headers: { Authorization: `Bearer ${config.umamiToken}` }
    });
    res.json({ ok: true, data: r.data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Sentry issues stub
router.get('/sentry/issues', async (req, res) => {
  if (!config.sentryAuthToken) {
    return res.json({ ok: true, data: { errors: 2, critical: 1, recent: [{ title: 'Contact form failing', time: '2h ago' }] } });
  }
  try {
    const r = await axios.get(`https://sentry.io/api/0/projects/`, {
      headers: { Authorization: `Bearer ${config.sentryAuthToken}` }
    });
    res.json({ ok: true, data: r.data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Twitter post (requires bearer token). This is a simple proxy to create a tweet or draft.
router.post('/twitter/post', async (req, res) => {
  const body = req.body;
  if (!config.twitterBearer) {
    return res.json({ ok: true, message: 'No Twitter token set — returning sample response', data: { id: '123', text: body.text || 'sample post' } });
  }
  try {
    const r = await axios.post('https://api.twitter.com/2/tweets', { text: body.text }, {
      headers: { Authorization: `Bearer ${config.twitterBearer}` }
    });
    res.json({ ok: true, data: r.data });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Gumroad resources (stub)
router.get('/gumroad/resources', async (req, res) => {
  if (!config.gumroadClientId) {
    return res.json({ ok: true, data: [{ title: 'Backend Architecture Blueprint', downloads: 342 }, { title: 'Cost Calculator', downloads: 128 }] });
  }
  // OAuth flow and real calls are left to you — fill CLIENT_ID/SECRET in .env and implement as needed
  res.json({ ok: false, message: 'Gumroad configured — implement OAuth flow in services/gumroad.js' });
});

// SolidGigs jobs stub
router.get('/solidgigs/jobs', (req, res) => {
  res.json({ ok: true, data: db.getLeads().slice(0,5).map((l,i)=>({title:`Job ${i+1}`,company:`Company ${i+1}`,score:7.8 })) });
});

// Contra projects stub
router.get('/contra/projects', (req, res) => {
  res.json({ ok: true, data: [{ title: 'SaaS Backend Development', budget: '$6K', posted: '3h ago' }] });
});

// TrustMRR stub
router.get('/trustmrr/mrr', (req,res)=>{
  if (!config.trustmrrKey) return res.json({ ok: true, data: { mrr: 340, arr: 4080 } });
  try{ res.json({ ok: false, message: 'TrustMRR configured — implement API call in services/trustmrr.js' }); }catch(e){res.status(502).json({ok:false,error:e.message});}
});

// AgentScope / Verdent / HeadAI / WebRobots / Startups.rip are similar stubs
router.get('/agentscope/status', (req,res)=> res.json({ ok: true, data: { running: 2, queued: 1 } }));
router.get('/verdent/insights', (req,res)=> res.json({ ok: true, data: [{ text: "Apollo sequence #3 has 0% reply rate" }] }));
router.get('/headai/signals', (req,res)=> res.json({ ok: true, data: [{ company: 'SnapData', hires: 5 }] }));
router.get('/webrobots/scrape', (req,res)=> res.json({ ok: true, data: { result: 'sample scraped data' } }));
router.get('/startupsRip/feed', (req,res)=> res.json({ ok: true, data: [{ title: 'TechVault shut down — founder starting new company' }] }));

// BetaList RSS proxy
router.get('/betalist/rss', async (req,res)=>{
  if (!config.betalistRss) return res.json({ ok: true, data: [{ title: 'AlphoTech SaaS Listing', upvotes: 47 }] });
  try{
    const r = await axios.get(config.betalistRss);
    res.set('Content-Type','application/xml');
    res.send(r.data);
  }catch(e){ res.status(502).json({ ok:false, error: e.message }); }
});

// Email inbound (for SolidGigs / Contra email parsing)
router.post('/email/inbound', (req,res)=>{
  // Example: configure your mail provider to POST parsed email JSON here
  const email = req.body;
  // Minimal parsing: create a lead out of the email
  const lead = {
    source: email.source || 'email',
    subject: email.subject || '',
    body: email.text || email.html || '',
    from: email.from || '',
    receivedAt: new Date().toISOString()
  };
  const saved = db.addLead(lead);
  res.json({ ok: true, data: saved });
});

// Gro.app webhook receiver
router.post('/gro/webhook', (req,res)=>{
  const secret = req.headers['x-gro-secret'] || req.query.secret;
  if (config.groSecret && secret !== config.groSecret) return res.status(401).json({ ok:false, message: 'Invalid webhook secret' });
  // handle payload
  const payload = req.body;
  // store or route to agent workflow
  res.json({ ok: true, received: payload });
});

module.exports = router;
