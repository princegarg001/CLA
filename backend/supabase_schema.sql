-- AlphoTech CLA v2 — Supabase schema
-- Run this in your Supabase project's SQL editor (Database > SQL Editor > New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- leads — every lead from every source (Apollo, SolidGigs, Contra, Gumroad,
-- Twitter DMs, contact form, FoundersDB, WebRobots, HeadAI) with unified scoring.
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  source text not null default 'manual', -- apollo | solidgigs | contra | gumroad | twitter | contact_form | founders_db | webrobots | headai | email
  name text,
  email text,
  role text,
  company text,
  company_size int,
  region text, -- US | UK | EU | other
  linkedin_url text,
  tech_stack text[],
  funding_round text,
  funding_amount numeric,
  intent_signal text,
  urgency text, -- low | medium | high
  score numeric default 1 check (score >= 1 and score <= 10),
  status text not null default 'new', -- new | contacted | replied | call_booked | proposal_sent | closed_won | closed_lost
  locked boolean not null default false, -- actively being worked: skip auto-rescoring, don't resurface as a "new" mission
  ai_brief text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Safe to re-run against a DB where `leads` already exists without `locked`.
alter table leads add column if not exists locked boolean not null default false;
create index if not exists idx_leads_score on leads (score desc);
create index if not exists idx_leads_source on leads (source);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_locked on leads (locked);

-- ---------------------------------------------------------------------------
-- deals — closed revenue (custom projects + recognized SaaS milestones)
-- ---------------------------------------------------------------------------
create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  value numeric not null default 0,
  currency text not null default 'USD',
  source text, -- apollo | contra | solidgigs | twitter | gumroad | direct
  closed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_deals_closed_at on deals (closed_at desc);

-- ---------------------------------------------------------------------------
-- sequences — Apollo email sequence tracking
-- ---------------------------------------------------------------------------
create table if not exists sequences (
  id uuid primary key default uuid_generate_v4(),
  apollo_sequence_id text,
  name text not null,
  lead_id uuid references leads(id) on delete cascade,
  status text not null default 'active', -- active | paused | completed | replied
  step int not null default 1,
  open_rate numeric,
  reply_rate numeric,
  booked_calls int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sequences_lead on sequences (lead_id);

-- ---------------------------------------------------------------------------
-- messages — unified outreach inbox across every channel
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  channel text not null, -- apollo_email | twitter_dm | contra | solidgigs | contact_form | whatsapp | email
  direction text not null default 'outbound', -- outbound | inbound
  tone text, -- technical | casual | formal | founder_to_founder
  market text, -- US | UK | EU
  subject text,
  body text,
  ai_generated boolean default false,
  status text not null default 'draft', -- draft | sent | replied | failed
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- client_id is added further down via ALTER, once `clients` exists (this
-- table is defined before `clients` in the file, so an inline forward
-- reference here would fail on a fresh database).
create index if not exists idx_messages_lead on messages (lead_id);
create index if not exists idx_messages_channel on messages (channel);

-- ---------------------------------------------------------------------------
-- templates — reusable message templates
-- ---------------------------------------------------------------------------
create table if not exists templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text, -- cold_open | follow_up | closing_push | solidgigs_pitch | contra_proposal
  tone text,
  market text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings — key/value app configuration
-- ---------------------------------------------------------------------------
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- icp_profiles — saved Ideal Client Profiles for Apollo Hunter
-- ---------------------------------------------------------------------------
create table if not exists icp_profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_size_min int,
  company_size_max int,
  industries text[],
  tech_stack text[],
  regions text[],
  seniority text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- scheduled_posts — Twitter/X post scheduler
-- ---------------------------------------------------------------------------
create table if not exists scheduled_posts (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  thread jsonb, -- array of tweet bodies when this is a thread
  scheduled_for timestamptz not null,
  status text not null default 'scheduled', -- scheduled | posted | failed | cancelled
  posted_tweet_id text,
  impressions int,
  engagements int,
  profile_visits int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scheduled_posts_time on scheduled_posts (scheduled_for);

-- ---------------------------------------------------------------------------
-- agent_runs — AI agent execution logs (AgentScope Prospector/Publisher/Researcher)
-- ---------------------------------------------------------------------------
create table if not exists agent_runs (
  id uuid primary key default uuid_generate_v4(),
  agent text not null, -- prospector | publisher | researcher
  trigger text, -- cron | manual | webhook
  status text not null default 'running', -- running | success | failed
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_agent_runs_agent on agent_runs (agent, started_at desc);

-- ---------------------------------------------------------------------------
-- oauth_connections — server-held tokens for platforms CLA posts to on your
-- behalf (LinkedIn, Instagram). Never exposed to the Flutter app; only the
-- backend reads/writes this table.
-- ---------------------------------------------------------------------------
create table if not exists oauth_connections (
  id uuid primary key default uuid_generate_v4(),
  platform text not null unique, -- linkedin | instagram
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  external_account_id text,
  external_account_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- social_posts — log of "Publish Everywhere" attempts, one row per platform
-- per publish call, so partial failures (e.g. LinkedIn ok, Instagram failed)
-- are visible after the fact.
-- ---------------------------------------------------------------------------
create table if not exists social_posts (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null default uuid_generate_v4(), -- groups the platforms from one "Publish Everywhere" call
  platform text not null, -- twitter | linkedin | instagram
  content text not null,
  image_url text,
  status text not null default 'pending', -- pending | success | failed
  external_post_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_social_posts_batch on social_posts (batch_id);

-- ---------------------------------------------------------------------------
-- content_calendar — the unified Social Command Center calendar. One row per
-- scheduled piece of content, possibly fanning out to multiple platforms;
-- per-platform outcomes land in `results` after the scheduler runs it.
-- ---------------------------------------------------------------------------
create table if not exists content_calendar (
  id uuid primary key default uuid_generate_v4(),
  content text not null default '',
  media_urls text[] default '{}',
  platforms text[] not null default '{}', -- twitter | instagram | reddit | linkedin
  post_type text not null default 'post', -- post | thread | reel | story | carousel | comment
  scheduled_for timestamptz not null,
  timezone text default 'America/New_York',
  status text not null default 'scheduled', -- scheduled | posted | failed | cancelled
  ai_generated boolean not null default false,
  results jsonb not null default '[]'::jsonb,
  engagement jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb, -- platform-specific extras (e.g. reddit subreddit/title)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_content_calendar_scheduled on content_calendar (scheduled_for);
create index if not exists idx_content_calendar_status on content_calendar (status);

-- ---------------------------------------------------------------------------
-- upwork_jobs — job posts monitored via a third-party watcher (Vollna),
-- forwarded email, or manual paste. Upwork has no public job-feed API and
-- bans automated applying, so this exists to make a human the fastest
-- possible applier: AI scores fit and pre-drafts the proposal the moment a
-- job lands, everything else is a one-tap review-and-copy.
-- ---------------------------------------------------------------------------
create table if not exists upwork_jobs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  client_name text,
  budget_min numeric,
  budget_max numeric,
  budget_type text, -- fixed | hourly
  skills text[] default '{}',
  country text,
  client_history jsonb default '{}'::jsonb, -- jobs posted, hire rate, total spent
  upwork_url text,
  ai_score numeric default 1 check (ai_score >= 1 and ai_score <= 10),
  ai_score_reason text,
  ai_proposal text,
  status text not null default 'new', -- new | applied | interviewing | hired | rejected | expired
  applied_at timestamptz,
  proposal_text text, -- what was actually submitted, once applied
  outcome_value numeric,
  source text not null default 'manual', -- vollna | email | manual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_upwork_jobs_score on upwork_jobs (ai_score desc);
create index if not exists idx_upwork_jobs_status on upwork_jobs (status);
create index if not exists idx_upwork_jobs_created on upwork_jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- clients — a lead that converted to closed_won. Locked by definition: once
-- created, the source lead is excluded from Apollo/War Room/Radar re-surfacing.
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete set null,
  name text not null,
  company text,
  email text,
  phone text,
  timezone text,
  region text, -- US | UK | EU
  preferred_channel text, -- email | whatsapp | slack | twitter_dm
  avatar_url text,
  status text not null default 'active', -- active | paused | completed | churned
  health_score int not null default 8 check (health_score >= 1 and health_score <= 10),
  health_reason text,
  total_revenue numeric not null default 0,
  total_projects int not null default 0,
  notes text,
  tags text[] default '{}',
  locked boolean not null default true, -- always true — prevents re-prospecting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_status on clients (status);
create index if not exists idx_clients_health on clients (health_score);
create index if not exists idx_clients_lead on clients (lead_id);

-- ---------------------------------------------------------------------------
-- projects — individual pieces of work for a client.
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'scoping', -- scoping | active | review | completed | cancelled
  budget numeric,
  currency text not null default 'USD',
  payment_type text not null default 'fixed', -- fixed | hourly | retainer
  hourly_rate numeric,
  hours_logged numeric not null default 0,
  timer_started_at timestamptz, -- non-null while a time-tracking timer is running
  start_date date,
  due_date date,
  completed_date date,
  source text, -- upwork | contra | solidgigs | apollo | direct
  contract_url text,
  -- Set once cron/referralFollowUp.js drafts the post-completion thank-you/
  -- referral message, so a daily cron doesn't re-draft the same project
  -- every day it stays completed.
  referral_followup_drafted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table projects add column if not exists referral_followup_drafted_at timestamptz;
create index if not exists idx_projects_client on projects (client_id);
create index if not exists idx_projects_status on projects (status);

-- ---------------------------------------------------------------------------
-- milestones — project deliverables with payment tracking.
-- ---------------------------------------------------------------------------
create table if not exists milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  amount numeric,
  status text not null default 'pending', -- pending | in_progress | delivered | approved | paid
  due_date date,
  delivered_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_milestones_project on milestones (project_id);
create index if not exists idx_milestones_due on milestones (due_date);

-- ---------------------------------------------------------------------------
-- invoices — payment tracking, optionally tied to one milestone.
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  milestone_id uuid references milestones(id) on delete set null,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending', -- pending | sent | paid | overdue
  due_date date,
  paid_at timestamptz,
  invoice_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_client on invoices (client_id);
create index if not exists idx_invoices_status on invoices (status);

-- ---------------------------------------------------------------------------
-- communication_log — every interaction with a client across every channel.
-- ---------------------------------------------------------------------------
create table if not exists communication_log (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  channel text not null, -- email | whatsapp | call | slack | twitter_dm | meeting
  direction text not null default 'outbound', -- outbound | inbound
  summary text not null,
  full_content text,
  sentiment text, -- positive | neutral | negative
  created_at timestamptz not null default now()
);
create index if not exists idx_comm_log_client on communication_log (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- testimonials — quotes from clients, tagged for reuse in proposals/outreach
-- (Growth Studio's Automation Engine, Outreach Composer, Upwork proposals).
-- ---------------------------------------------------------------------------
create table if not exists testimonials (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  quote text not null,
  author_name text,
  author_title text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_testimonials_client on testimonials (client_id);

-- ---------------------------------------------------------------------------
-- device_tokens — FCM push tokens. Single-user tool, but still keyed by
-- token (not a fixed row) so an app reinstall / token rotation just upserts
-- a new row rather than needing "the" one row updated in place.
-- ---------------------------------------------------------------------------
create table if not exists device_tokens (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  platform text not null default 'android', -- android | ios
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- referred_by references `clients`, which is defined after `leads` above —
-- added here via ALTER rather than inline in leads' own CREATE TABLE so the
-- forward reference resolves. Also safe to re-run on a DB that already has
-- both tables from an earlier version of this file.
alter table leads add column if not exists referred_by uuid references clients(id);
-- Running credit owed for referrals a client has sent — a single balance,
-- not a full transaction ledger (nothing here processes payouts).
alter table clients add column if not exists referral_credit_owed numeric not null default 0;
-- messages.client_id: see the comment on `messages` above for why this is
-- an ALTER rather than an inline column.
alter table messages add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_messages_client on messages (client_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- This is a single-tenant founder tool. RLS is enabled with a service-role-only
-- policy, so the backend MUST connect using the "service_role" key (Project
-- Settings -> API), not the anon/public key — the anon key would satisfy none
-- of these policies and every query would silently return zero rows. Only the
-- backend (a trusted server) should ever hold the service_role key; never ship
-- it to the Flutter app. Tighten further if you add real multi-user auth later.
-- ---------------------------------------------------------------------------
alter table leads enable row level security;
alter table deals enable row level security;
alter table sequences enable row level security;
alter table messages enable row level security;
alter table templates enable row level security;
alter table settings enable row level security;
alter table icp_profiles enable row level security;
alter table scheduled_posts enable row level security;
alter table agent_runs enable row level security;
alter table oauth_connections enable row level security;
alter table social_posts enable row level security;
alter table content_calendar enable row level security;
alter table upwork_jobs enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table milestones enable row level security;
alter table invoices enable row level security;
alter table communication_log enable row level security;
alter table testimonials enable row level security;
alter table device_tokens enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['leads','deals','sequences','messages','templates','settings','icp_profiles','scheduled_posts','agent_runs','oauth_connections','social_posts','content_calendar','upwork_jobs','clients','projects','milestones','invoices','communication_log','testimonials','device_tokens'])
  loop
    execute format('drop policy if exists "service_role_all" on %I;', t);
    execute format(
      'create policy "service_role_all" on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'');',
      t
    );
  end loop;
end $$;
