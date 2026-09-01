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
  channel text not null, -- apollo_email | twitter_dm | contra | solidgigs | contact_form | whatsapp
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

do $$
declare
  t text;
begin
  for t in select unnest(array['leads','deals','sequences','messages','templates','settings','icp_profiles','scheduled_posts','agent_runs','oauth_connections','social_posts'])
  loop
    execute format('drop policy if exists "service_role_all" on %I;', t);
    execute format(
      'create policy "service_role_all" on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'');',
      t
    );
  end loop;
end $$;
