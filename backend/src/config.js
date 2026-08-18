require('dotenv').config();

const bool = (v) => v === 'true' || v === '1';

const config = {
  port: process.env.PORT || 8080,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`,
  nodeEnv: process.env.NODE_ENV || 'development',
  claApiKey: process.env.CLA_API_KEY || '',
  cronEnabled: bool(process.env.CRON_ENABLED),

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),

  apolloApiKey: process.env.APOLLO_API_KEY || '',
  apolloBaseUrl: process.env.APOLLO_BASE_URL || 'https://api.apollo.io/api/v1',

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
};

config.isConfigured = (name) => (CHECKS[name] ? CHECKS[name]() : false);

config.integrationStatus = () =>
  Object.keys(CHECKS).reduce((acc, key) => {
    acc[key] = CHECKS[key]();
    return acc;
  }, {});

module.exports = config;
