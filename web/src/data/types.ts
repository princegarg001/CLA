export interface Lead {
  id: string;
  source: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  company?: string | null;
  company_size?: number | null;
  region?: string | null;
  linkedin_url?: string | null;
  tech_stack?: string[];
  funding_round?: string | null;
  funding_amount?: number | null;
  intent_signal?: string | null;
  urgency?: string | null;
  score: number;
  status: string;
  locked: boolean;
  ai_brief?: string | null;
  referred_by?: string | null;
  created_at?: string | null;
  sample?: boolean;
  [key: string]: unknown;
}

export function leadDisplayName(l: Lead): string {
  return l.name || l.email || 'Unknown contact';
}

export function leadDisplayTitle(l: Lead): string {
  if (l.role && l.company) return `${l.role} @ ${l.company}`;
  return l.role || l.company || '';
}

export interface Mission {
  text: string;
  priority: number;
}

export type FeedAlertType = 'lead' | 'alert' | 'traffic' | 'client_health' | 'milestone_due' | 'invoice_overdue';

export interface FeedAlert {
  type: FeedAlertType | string;
  text: string;
  timestamp?: string | null;
}

export interface WarRoomSummary {
  pipeline: Record<string, number>;
  mrr: number;
  arr: number;
}

export interface ApolloSequence {
  id: string;
  name: string;
  open_rate?: number | null;
  reply_rate?: number | null;
  booked_calls: number;
  sample?: boolean;
}

export interface IcpProfile {
  id: string;
  name: string;
  industries: string[];
  tech_stack: string[];
  regions: string[];
}

// ---- Freelance / Upwork ----------------------------------------------------

export interface UpworkJob {
  id: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_type: 'fixed' | 'hourly';
  skills: string[];
  country?: string | null;
  client_history: Record<string, unknown>;
  upwork_url?: string | null;
  ai_score: number;
  ai_score_reason?: string | null;
  ai_proposal?: string | null;
  status: 'new' | 'applied' | 'interviewing' | 'hired' | 'rejected' | 'expired';
  source: string;
  created_at?: string | null;
  sample?: boolean;
}

export function upworkBudgetLabel(j: UpworkJob): string {
  if (j.budget_type === 'hourly') {
    if (j.budget_min != null && j.budget_max != null) return `$${j.budget_min}-$${j.budget_max}/hr`;
    return 'Hourly';
  }
  if (j.budget_min != null && j.budget_max != null) return `$${j.budget_min}-$${j.budget_max}`;
  if (j.budget_max != null) return `Up to $${j.budget_max}`;
  if (j.budget_min != null) return `From $${j.budget_min}`;
  return 'Budget not specified';
}

export interface UpworkStats {
  winRate: number;
  avgDealSize: number;
  avgApplyDelayHours: number;
  pipeline: Record<string, number>;
  sample?: boolean;
}

export interface RssItem {
  title: string;
  link?: string | null;
  publishedAt?: string | null;
  summary?: string | null;
}

// ---- Client Vault -----------------------------------------------------------

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description?: string | null;
  status: 'scoping' | 'active' | 'review' | 'completed' | 'cancelled';
  budget?: number | null;
  currency: string;
  payment_type: string;
  hourly_rate?: number | null;
  hours_logged: number;
  timer_started_at?: string | null;
  due_date?: string | null;
  source?: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  status: string;
  due_date?: string | null;
}

export interface Invoice {
  id: string;
  client_id: string;
  project_id?: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue';
  due_date?: string | null;
  paid_at?: string | null;
}

export interface CommunicationLogEntry {
  id: string;
  client_id: string;
  channel: string;
  direction: 'outbound' | 'inbound';
  summary: string;
  full_content?: string | null;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  created_at?: string | null;
}

export interface Testimonial {
  id: string;
  client_id: string;
  quote: string;
  author_name?: string | null;
  author_title?: string | null;
  tags?: string[];
  created_at?: string | null;
}

export interface Client {
  id: string;
  lead_id?: string | null;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  timezone?: string | null;
  region?: string | null;
  preferred_channel?: string | null;
  status: 'active' | 'paused' | 'completed' | 'churned';
  health_score: number;
  health_reason?: string | null;
  total_revenue: number;
  total_projects: number;
  notes?: string | null;
  tags?: string[];
  created_at?: string | null;
  updated_at?: string | null;
  projects?: Project[];
  invoices?: Invoice[];
  recentTimeline?: CommunicationLogEntry[];
  testimonials?: Testimonial[];
}

// ---- Growth Studio ------------------------------------------------------------

export type SocialPlatform = 'twitter' | 'linkedin' | 'reddit';

export interface MediaItem {
  url: string;
  type: 'image' | 'gif' | 'video';
  mime?: string;
  size?: number;
  name?: string;
  path?: string;
}

export interface PlatformVariant {
  text?: string;
  title?: string;
  subreddit?: string;
  kind?: 'self' | 'link' | 'image';
  linkUrl?: string;
  flairId?: string;
}

export type Variants = Partial<Record<string, PlatformVariant>>;

export interface PublishResult {
  platform: string;
  status: 'success' | 'skipped' | 'failed';
  externalPostId?: string | null;
  url?: string | null;
  error?: string | null;
  reason?: string | null;
  retriable?: boolean;
}

export function publishSucceeded(r: PublishResult): boolean {
  return r.status === 'success';
}

export type CalendarStatus = 'draft' | 'scheduled' | 'publishing' | 'posted' | 'partial' | 'failed' | 'cancelled';

export interface CalendarEntry {
  id: string;
  content: string;
  media_urls: string[];
  platforms: string[];
  post_type: string;
  scheduled_for: string;
  timezone: string;
  status: CalendarStatus;
  ai_generated: boolean;
  results: PublishResult[];
  raw?: {
    media?: MediaItem[];
    variants?: Variants;
    attempts?: number;
    next_attempt_at?: string | null;
  };
}

export interface ValidationIssue {
  platform: string | null;
  field: string;
  message: string;
}

export interface PlatformValidation {
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  text: { length: number; limit: number } | null;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  platforms: Record<string, PlatformValidation>;
}

export interface SocialLimits {
  limits: Record<string, Record<string, unknown>>;
  uploadMaxBytes: number;
  mediaTypes: Record<string, 'image' | 'gif' | 'video'>;
}

export interface SubredditInfo {
  sample?: boolean;
  name: string;
  subscribers: number | null;
  submissionType: string;
  over18: boolean;
  rules: { name: string; description: string }[];
  flairs: { id: string; text: string }[];
}

export interface TwitterAnalytics {
  available: boolean;
  message?: string | null;
  followers: number;
  followersDelta7d: number;
  geography: Record<string, number>;
  topTweets: Record<string, unknown>[];
}

export interface ScheduledPost {
  id: string;
  content: string;
  scheduled_for?: string | null;
  status: string;
}

export interface GumroadProduct {
  name: string;
  downloads: number;
  price: number;
}

export interface GumroadStats {
  totalDownloads: number;
  salesCount: number;
  topResource?: string | null;
  products: GumroadProduct[];
}

export interface RedditPost {
  id: string;
  fullname: string;
  subreddit: string;
  title: string;
  body: string;
  author: string;
  url: string;
  score: number;
  numComments: number;
  createdAt?: string | null;
  keywordScore: number;
  sample?: boolean;
}

export interface RedditKarma {
  linkKarma: number;
  commentKarma: number;
  accountAgeDays?: number | null;
  username?: string | null;
  sample?: boolean;
}

// ---- AI Agent Lab -------------------------------------------------------------

export interface AgentInfo {
  name: string;
  status: 'running' | 'idle';
  lastRun?: string | null;
}

export interface AgentStatusSummary {
  running: number;
  queued: number;
  agents: AgentInfo[];
}

export interface AgentRun {
  id: string;
  agent: string;
  trigger: string;
  status: string;
  output: Record<string, unknown>;
  error?: string | null;
  started_at?: string | null;
}

export interface VerdentInsight {
  text: string;
}

export interface HiringSignal {
  company: string;
  hires: number;
  roles: string[];
  region?: string | null;
}

// ---- Revenue Command ------------------------------------------------------------

export interface MrrData {
  mrr: number;
  arr: number;
  newMrr?: number | null;
  churnRate?: number | null;
  expansionMrr?: number | null;
  netRevenueRetention?: number | null;
}

export interface TrendPoint {
  week: number;
  mrr: number;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  source?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
}

export interface ReferralStats {
  leadCount: number;
  clientCount: number;
  revenue: number;
}

export interface RevenueSummary {
  mrr: number;
  arr: number;
  projectRevenue: number;
  totalRevenue: number;
  avgDealSize: number;
  dealCount: number;
  revenueBySource: Record<string, number>;
  referrals: ReferralStats;
}

// ---- Analytics Tower ------------------------------------------------------------

export interface UmamiStats {
  pageviews: number;
  visitors: number;
  bounceRate?: number | null;
  topSources: Record<string, unknown>[];
  topPages: Record<string, unknown>[];
  geography: Record<string, number>;
}

export interface SentryHealth {
  status: 'red' | 'amber' | 'green';
  errorsToday: number;
  critical: number;
  warnings: number;
  resolved: number;
  recent: Record<string, unknown>[];
}

export interface WeeklyReport {
  newLeads: number;
  callsBooked: number;
  dealsClosed: number;
  revenueClosed: number;
  insight: string;
}

// ---- Outreach Composer ------------------------------------------------------------

export interface OutreachMessage {
  id: string;
  lead_id?: string | null;
  channel: string;
  direction: string;
  tone?: string | null;
  market?: string | null;
  subject?: string | null;
  body: string;
  ai_generated: boolean;
  status: 'draft' | 'sent' | 'replied';
  created_at?: string | null;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category?: string | null;
  tone?: string | null;
  market?: string | null;
  body: string;
}
