require('dotenv').config();

const bool = (v) => v === 'true' || v === '1';

// Comma-separated env var -> trimmed array, falling back to a default list.
const csv = (v, fallback = []) => {
  const parts = (v || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
};

const config = {
  port: process.env.PORT || 8080,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`,
  nodeEnv: process.env.NODE_ENV || 'development',
  claApiKey: process.env.CLA_API_KEY || '',
  cronEnabled: bool(process.env.CRON_ENABLED),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  // Defaults to Groq's OpenAI-compatible endpoint since that's the free provider
  // this app ships wired to. Point back at https://api.openai.com/v1 (and use an
  // sk-... key + gpt-4o-mini) to switch to real OpenAI instead — aiService.js
  // doesn't care which one it's talking to.
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
  // Groq's model lineup changes over time (llama-3.3-70b-versatile was
  // removed at some point) — verify against GET /openai/v1/models with your
  // key if this one ever starts 404ing again, rather than guessing.
  openaiModel: process.env.OPENAI_MODEL || 'openai/gpt-oss-120b',
  openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),

  apolloApiKey: process.env.APOLLO_API_KEY || '',
  apolloBaseUrl: process.env.APOLLO_BASE_URL || 'https://api.apollo.io/api/v1',
  // Used by the 48h Gumroad auto-follow-up step (leadPipelineService) — which
  // Apollo sequence a stale high-score Gumroad lead gets queued into. Leave
  // blank to skip the live Apollo call (the lead still gets marked contacted
  // and keeps its AI-drafted outreach message for manual sending).
  apolloDefaultSequenceId: process.env.APOLLO_DEFAULT_SEQUENCE_ID || '',

  umamiToken: process.env.UMAMI_TOKEN || '',
  umamiSiteId: process.env.UMAMI_SITE_ID || '',
  umamiBaseUrl: process.env.UMAMI_BASE_URL || 'https://analytics.umami.is/api',

  sentryAuthToken: process.env.SENTRY_AUTH_TOKEN || '',
  sentryOrg: process.env.SENTRY_ORG || '',
  sentryProject: process.env.SENTRY_PROJECT || '',

  twitterTier: process.env.TWITTER_TIER || 'free',
  twitterBearer: process.env.TWITTER_BEARER_TOKEN || '',
  twitterApiKey: process.env.TWITTER_API_KEY || '',
  twitterApiSecret: process.env.TWITTER_API_SECRET || '',
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET || '',

  trustmrrKey: process.env.TRUSTMRR_API_KEY || '',
  trustmrrBase: process.env.TRUSTMRR_BASE_URL || '',

  gumroadAccessToken: process.env.GUMROAD_ACCESS_TOKEN || '',

  agentscopeUrl: process.env.AGENTSCOPE_API_URL || '',
  agentscopeKey: process.env.AGENTSCOPE_API_KEY || '',

  verdentKey: process.env.VERDENT_API_KEY || '',

  headaiKey: process.env.HEADAI_API_KEY || '',

  webrobotsKey: process.env.WEBROBOTS_API_KEY || '',

  groSecret: process.env.GRO_WEBHOOK_SECRET || '',

  betalistRss: process.env.BETALIST_RSS_URL || 'https://betalist.com/feed',
  startupsRipRss: process.env.STARTUPSRIP_RSS || 'https://startups.rip/feed',

  solidgigsEmail: process.env.SOLIDGIGS_INBOUND_EMAIL || '',
  contraEmail: process.env.CONTRA_INBOUND_EMAIL || '',

  foundersDbKey: process.env.FOUNDERSDB_API_KEY || '',
  paperclipKey: process.env.PAPERCLIP_API_KEY || '',

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  alertEmailTo: process.env.ALERT_EMAIL_TO || '',

  // ---- Social publishing (Automation Engine) --------------------------------
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  linkedinRedirectUri: process.env.LINKEDIN_REDIRECT_URI || '',

  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: process.env.META_APP_SECRET || '',
  metaRedirectUri: process.env.META_REDIRECT_URI || '',

  // ---- Reddit (free: OAuth2 "script" app, 100 requests/minute) --------------
  redditClientId: process.env.REDDIT_CLIENT_ID || '',
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET || '',
  redditUsername: process.env.REDDIT_USERNAME || '',
  redditPassword: process.env.REDDIT_PASSWORD || '',
  redditUserAgent: process.env.REDDIT_USER_AGENT || 'CLA:v2:1.0 (by /u/alphotech)',
  redditMonitoredSubs: csv(process.env.REDDIT_MONITORED_SUBS, [
    'SaaS', 'startups', 'webdev', 'node', 'django',
    'freelance', 'forhire', 'fintech', 'devops', 'microservices',
  ]),
  redditKeywords: csv(process.env.REDDIT_KEYWORDS, [
    'backend', 'api', 'microservices', 'automation',
    'python', 'node', 'devops', 'fintech',
  ]),

  // Timezone a content-calendar entry falls back to when the client doesn't
  // send one, so "9am" in the UI means the same instant on the server.
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',

  // ---- Upwork monitoring (no official API for job feeds — jobs arrive via a
  // third-party watcher like Vollna, or an email forward, or manual paste) ---
  upworkWebhookSecret: process.env.UPWORK_WEBHOOK_SECRET || '',
  upworkSkills: csv(process.env.UPWORK_SKILLS, [
    'Python', 'Node.js', 'Backend', 'DevOps', 'Microservices', 'API', 'Automation',
  ]),
  upworkMinBudget: parseInt(process.env.UPWORK_MIN_BUDGET || '500', 10),
};

// isConfigured('apollo') -> true if APOLLO_API_KEY is set, etc.
// Central place every service/route uses to decide "live call" vs "sample data".
const CHECKS = {
  supabase: () => !!(config.supabaseUrl && config.supabaseKey),
  openai: () => !!config.openaiApiKey,
  apollo: () => !!config.apolloApiKey,
  umami: () => !!(config.umamiToken && config.umamiSiteId),
  sentry: () => !!(config.sentryAuthToken && config.sentryOrg && config.sentryProject),
  twitter: () => !!config.twitterBearer,
  trustmrr: () => !!config.trustmrrKey,
  gumroad: () => !!config.gumroadAccessToken,
  agentscope: () => !!(config.agentscopeUrl && config.agentscopeKey),
  verdent: () => !!config.verdentKey,
  headai: () => !!config.headaiKey,
  webrobots: () => !!config.webrobotsKey,
  gro: () => !!config.groSecret,
  betalist: () => !!config.betalistRss,
  startupsRip: () => !!config.startupsRipRss,
  solidgigs: () => !!config.solidgigsEmail,
  contra: () => !!config.contraEmail,
  foundersDb: () => !!config.foundersDbKey,
  paperclip: () => !!config.paperclipKey,
  smtp: () => !!(config.smtpHost && config.smtpUser && config.smtpPass),
  // These reflect "the app credentials exist so the OAuth flow can start" —
  // not "an account is actually connected". Actual connection status (a real
  // token stored in oauth_connections) is reported separately by
  // GET /api/social/status, since that requires a DB read this sync check can't do.
  linkedin: () => !!(config.linkedinClientId && config.linkedinClientSecret),
  instagram: () => !!(config.metaAppId && config.metaAppSecret),
  // Reddit uses a "script" app tied to your own account — there's no browser
  // OAuth step, so having the four credentials IS being connected.
  reddit: () =>
    !!(config.redditClientId && config.redditClientSecret && config.redditUsername && config.redditPassword),
  // Posting to X needs OAuth 1.0a user context; the app-only bearer can read
  // but never write. Tracked separately from `twitter` so the UI can say
  // "reads work, posting won't" instead of only finding out at publish time.
  twitterWrite: () =>
    !!(config.twitterApiKey && config.twitterApiSecret && config.twitterAccessToken && config.twitterAccessSecret),
  // Upwork has no auth of its own to configure — "connected" just means a
  // webhook secret is set, so an inbound feed can be verified rather than
  // accepted from anyone who finds the URL.
  upwork: () => !!config.upworkWebhookSecret,
};

config.isConfigured = (name) => (CHECKS[name] ? CHECKS[name]() : false);

// twitterWrite is a capability flag under the "twitter" integration, not a
// separate one — kept out of the Settings screen's integration grid so it
// doesn't get counted/listed as its own platform.
const GRID_EXCLUDED = new Set(['twitterWrite']);

config.integrationStatus = () =>
  Object.keys(CHECKS)
    .filter((key) => !GRID_EXCLUDED.has(key))
    .reduce((acc, key) => {
      acc[key] = CHECKS[key]();
      return acc;
    }, {});

module.exports = config;
