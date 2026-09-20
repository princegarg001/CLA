const config = require('../config');
const logger = require('../utils/logger');

let client = null;
function getClient() {
  if (!client) {
    const OpenAI = require('openai');
    // The `openai` SDK talks to any OpenAI-compatible endpoint, not just
    // OpenAI itself — baseURL is what actually selects the provider (Groq by
    // default here; see config.js).
    client = new OpenAI({ apiKey: config.openaiApiKey, baseURL: config.openaiBaseUrl });
  }
  return client;
}

// Every AI call in the app funnels through here so OPENAI_MODEL is the single
// place that controls which model is used (per implementation_plan resolved decision).
async function complete({ system, prompt, json = false, maxTokens }) {
  if (!config.isConfigured('openai')) {
    throw Object.assign(new Error('OpenAI not configured'), { status: 503 });
  }
  const openai = getClient();
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    max_tokens: maxTokens || config.openaiMaxTokens,
    messages,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

async function safeComplete(args, fallback) {
  if (!config.isConfigured('openai')) return fallback;
  try {
    return await complete(args);
  } catch (e) {
    logger.warn('aiService: completion failed, using fallback', { error: e.message });
    return fallback;
  }
}

async function scoreLead(lead) {
  const fallback = heuristicScore(lead);
  const text = await safeComplete(
    {
      system:
        'You score B2B leads for AlphoTech, a backend engineering/automation studio targeting funded US/UK/EU startups (11-200 employees). ' +
        'Score 1-10 using: intent strength, company size fit, region (US/UK/EU preferred), budget signal (funding), technical fit (Python/microservices/fintech), urgency language. ' +
        'Respond with ONLY a JSON object: {"score": <1-10 integer>, "reason": "<one sentence>"}.',
      prompt: JSON.stringify(lead),
      json: true,
      maxTokens: 200,
    },
    JSON.stringify({ score: fallback, reason: 'Heuristic fallback score (AI call unavailable — see server logs for why).' })
  );
  try {
    const parsed = JSON.parse(text);
    return { score: Math.max(1, Math.min(10, Math.round(parsed.score))), reason: parsed.reason };
  } catch {
    return { score: fallback, reason: 'Heuristic fallback score (AI response unparsable).' };
  }
}

function heuristicScore(lead = {}) {
  let score = 3;
  const region = (lead.region || '').toUpperCase();
  if (['US', 'UK', 'EU'].includes(region)) score += 2;
  if (lead.company_size >= 11 && lead.company_size <= 200) score += 2;
  if (lead.funding_round || lead.funding_amount) score += 1;
  const techBlob = JSON.stringify(lead.tech_stack || '').toLowerCase();
  if (/python|microservice|fintech|node|automation/.test(techBlob)) score += 1;
  const intent = `${lead.intent_signal || ''} ${lead.urgency || ''}`.toLowerCase();
  if (/asap|urgent|immediately|deadline|this week/.test(intent)) score += 1;
  return Math.max(1, Math.min(10, score));
}

async function generateLeadBrief(lead) {
  return safeComplete(
    {
      system:
        'You write a 1-page pre-call brief for a solo backend engineering founder (AlphoTech). ' +
        'Summarize the company, likely pain points, funding/hiring signals, and 2-3 conversation openers. Be concise, no fluff.',
      prompt: JSON.stringify(lead),
      maxTokens: 500,
    },
    `${lead.company || 'This lead'} — no AI brief available right now (see server logs for why). Raw data: ${JSON.stringify(lead)}`
  );
}

async function generateOutreachMessage({ lead, tone = 'founder_to_founder', market = 'US', channel = 'apollo_email', context = '' }) {
  return safeComplete(
    {
      system:
        `You write cold outreach for AlphoTech, a backend engineering/automation studio. Tone: ${tone}. Market: ${market} ` +
        `(US = ROI-driven language, UK = credibility-driven, EU = process/compliance-driven). Channel: ${channel}. ` +
        'Keep it short, specific, no generic flattery, one clear CTA.',
      prompt: `Lead: ${JSON.stringify(lead)}\nExtra context: ${context}`,
      maxTokens: 350,
    },
    `Hi ${lead.name || 'there'},\n\n[AI draft unavailable right now — write this one manually.]\n\n— AlphoTech`
  );
}

async function generateTwitterThread(topic) {
  return safeComplete(
    {
      system:
        "Write a Twitter/X thread in AlphoTech's voice (backend engineering studio for funded startups). " +
        'Format: hook tweet, 6-8 body tweets, one CTA tweet. Return each tweet on its own line, no numbering.',
      prompt: `Topic: ${topic}`,
      maxTokens: 700,
    },
    `[AI thread unavailable right now]\nHook: ${topic}\n...`
  );
}

async function weeklyStrategicInsight(metrics) {
  return safeComplete(
    {
      system:
        'You are a growth strategist for a solo backend engineering founder. Given weekly metrics across channels, ' +
        'output 2-4 short, specific, actionable recommendations (one sentence each). No generic advice.',
      prompt: JSON.stringify(metrics),
      maxTokens: 400,
    },
    'AI insight unavailable right now. Review your metrics manually this week.'
  );
}

function voiceClause(voice) {
  return voice && String(voice).trim()
    ? ` Write in this author's voice — match its tone, sentence length and vocabulary:\n"""\n${String(voice).trim().slice(0, 2500)}\n"""`
    : '';
}

// Workflow 2 ("The Publisher"): given last week's per-platform engagement,
// plan 5 pieces for the coming week — 2 Twitter threads, 2 LinkedIn posts,
// 1 Reddit post. Returns [] when AI is unavailable: an empty week is honest,
// whereas placeholder drafts ("Body 1...") are one tap from being published.
async function generateWeeklyContentPlan(engagement, { voice } = {}) {
  const text = await safeComplete(
    {
      system:
        'You are a content strategist for AlphoTech, a backend engineering/automation studio for funded startups. ' +
        "Given last week's engagement metrics across Twitter, LinkedIn and Reddit, plan exactly 5 content pieces for " +
        'the coming week: 2 Twitter threads, 2 LinkedIn posts, 1 Reddit post (educational, value-first, no self-promotion). ' +
        'Base topics on what performed best last week when the data suggests something. Every piece must be complete, ' +
        'publishable copy — never placeholders or outlines. ' +
        'Respond with ONLY a JSON object: {"items": [{"platform": "twitter|linkedin|reddit", ' +
        '"postType": "thread|post", "dayOffset": <1-7, days from today>, "title": "<reddit only: the post title>", ' +
        '"content": "<the actual copy; for a thread separate tweets with a blank line, each under 280 characters>"}]} — exactly 5 items.' +
        voiceClause(voice),
      prompt: JSON.stringify(engagement || {}),
      json: true,
      maxTokens: 2000,
    },
    null
  );
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

// Cut at the last sentence/word boundary that fits, never mid-word.
function smartTruncate(text, max) {
  const t = String(text || '').trim();
  if (Array.from(t).length <= max) return t;
  const chars = Array.from(t).slice(0, max - 1).join('');
  const cut = Math.max(chars.lastIndexOf('. '), chars.lastIndexOf('! '), chars.lastIndexOf('? '));
  if (cut > max * 0.5) return chars.slice(0, cut + 1);
  const space = chars.lastIndexOf(' ');
  return `${chars.slice(0, space > 0 ? space : chars.length).trim()}…`;
}

// Compose once → a tailored version per platform. `baseText` (a rough draft)
// and/or `topic` (an idea) go in; each requested platform gets copy that fits
// its norms and hard limits. Falls back to mechanical trimming if AI is down
// so the composer still fills in something sensible.
async function generatePlatformVariants({ topic, baseText, platforms = [], subreddits = [], voice } = {}) {
  const fallback = () => {
    const src = String(baseText || topic || '').trim();
    const out = {};
    for (const p of platforms) {
      if (p === 'twitter') out.twitter = { text: smartTruncate(src, 280) };
      else if (p === 'linkedin') out.linkedin = { text: src };
      else if (p === 'reddit') {
        const [first, ...rest] = src.split(/\n+/);
        out.reddit = { title: smartTruncate(first, 300), text: rest.join('\n').trim(), subreddit: subreddits[0] || '' };
      } else out[p] = { text: src };
    }
    return out;
  };

  const text = await safeComplete(
    {
      system:
        'You adapt one idea into platform-native posts for AlphoTech, a backend engineering/automation studio founder. ' +
        'Rules: TWITTER — one tweet, hard max 270 characters, punchy, no hashtags spam (0-1 max). ' +
        'LINKEDIN — 600-1300 characters, a strong first line hook, short paragraphs, a soft closing question, at most 3 hashtags at the end. ' +
        'REDDIT — genuinely useful and specific, no marketing tone, no links unless essential; give a "title" (max 300 chars, descriptive, not clickbait) and a "text" body (self post); pick the best "subreddit" from the provided list. ' +
        'Never invent statistics, clients or claims. ' +
        'Respond with ONLY JSON: {"twitter": {"text": ""}, "linkedin": {"text": ""}, "reddit": {"title": "", "text": "", "subreddit": ""}} ' +
        `including only these platforms: ${platforms.join(', ')}.` +
        voiceClause(voice),
      prompt: JSON.stringify({ topic: topic || null, draft: baseText || null, subreddits }),
      json: true,
      maxTokens: 1600,
    },
    null
  );
  if (!text) return { variants: fallback(), ai: false };
  try {
    const parsed = JSON.parse(text);
    const variants = {};
    for (const p of platforms) {
      if (parsed[p]) variants[p] = parsed[p];
    }
    if (variants.twitter) variants.twitter.text = smartTruncate(variants.twitter.text, 280);
    if (variants.reddit && !variants.reddit.subreddit) variants.reddit.subreddit = subreddits[0] || '';
    return { variants: Object.keys(variants).length ? variants : fallback(), ai: Object.keys(variants).length > 0 };
  } catch {
    return { variants: fallback(), ai: false };
  }
}

module.exports = {
  complete,
  safeComplete,
  scoreLead,
  heuristicScore,
  generateLeadBrief,
  generateOutreachMessage,
  generateTwitterThread,
  weeklyStrategicInsight,
  generateWeeklyContentPlan,
  generatePlatformVariants,
  smartTruncate,
};
