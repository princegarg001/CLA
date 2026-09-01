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
    JSON.stringify({ score: fallback, reason: 'Heuristic fallback score (OpenAI not configured).' })
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
    `${lead.company || 'This lead'} — no AI brief available (OpenAI not configured). Raw data: ${JSON.stringify(lead)}`
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
    `Hi ${lead.name || 'there'},\n\n[AI draft unavailable — OpenAI not configured. Write manually.]\n\n— AlphoTech`
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
    `[AI thread unavailable — OpenAI not configured]\nHook: ${topic}\n...`
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
    'AI insight unavailable — OpenAI not configured. Review your metrics manually this week.'
  );
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
};
