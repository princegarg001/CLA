import { useState } from 'react';
import { Target, RefreshCw, Sparkles, Mail, ExternalLink, Copy, Check, Briefcase, Clock, SlidersHorizontal, ThumbsDown, MessageCircle, AlertTriangle } from 'lucide-react';
import {
  recOf,
  useDismissRec,
  useIcp,
  useRefreshRecs,
  useSaveIcp,
  useSetLeadStatus,
  useSourceStats,
  useTodayRecs,
  useAssistReply,
  type RecItem,
  type RecKind,
} from '../../data/hooks/useRecommendations';
import { Card, Badge, AccentButton, LoadingState, EmptyState, ErrorState, TabBar } from '../../components/ui';

const SOURCE_LABEL: Record<string, string> = {
  hn_freelancer: 'HN · seeking freelancer',
  hn_search: 'HN · asking for a dev',
  hn_hiring: 'HN · who is hiring',
  reddit: 'Reddit',
  remoteok: 'RemoteOK',
  remotive: 'Remotive',
  wwr: 'We Work Remotely',
};

const KIND_META: Record<RecKind, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  seeking: { label: 'Asking for help', tone: 'success' },
  hiring_contract: { label: 'Contract work', tone: 'warning' },
  hiring_fte: { label: 'Hiring full-time', tone: 'muted' },
};

const DISMISS_REASONS = ['Not a fit', 'Already filled / stale', 'Too small', 'Looks like spam'];

function age(iso?: string): string {
  if (!iso) return '';
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (!Number.isFinite(h)) return '';
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function RecCard({ item }: { item: RecItem }) {
  const { lead } = item;
  const rec = recOf(lead);
  const setStatus = useSetLeadStatus();
  const dismiss = useDismissRec();
  const [draft, setDraft] = useState(rec?.draft || '');
  const [copied, setCopied] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  if (!rec) return null;

  const done = lead.status !== 'new';
  const kind = KIND_META[rec.kind];
  const score10 = lead.score;
  const subject = `Re: ${lead.role || 'your post'}`;
  const mailto = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}` : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is still selectable in the box */
    }
  }

  return (
    <Card className={`p-5 ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 h-11 w-11 rounded-xl flex flex-col items-center justify-center font-mono-tab ${score10 >= 6 ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
          <span className="text-base font-bold leading-none">{score10}</span>
          <span className="text-[9px] opacity-70">/10</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[15px] truncate">{lead.company || lead.name || 'Unknown'}</p>
            <Badge tone={kind.tone}>{kind.label}</Badge>
            {rec.fit === 'strong' && <Badge tone="success">AI: strong fit</Badge>}
            {done && <Badge tone="info">{lead.status.replace('_', ' ')}</Badge>}
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{lead.role}</p>
          <p className="text-[11px] text-text-faint mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{SOURCE_LABEL[lead.source] || lead.source}</span>
            <span className="flex items-center gap-1">
              <Clock size={10} /> {age(rec.postedAt)}
            </span>
            {rec.location && <span>{rec.location}</span>}
            {rec.budget && <span className="text-amber">{rec.budget}</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {rec.reasons.slice(0, 5).map((r) => (
          <span key={r} className="rounded-full bg-bg-soft border border-border-soft px-2.5 py-0.5 text-[11px] text-text-muted">
            {r}
          </span>
        ))}
      </div>

      <p className="text-sm mt-3">{rec.why}</p>
      <p className="text-xs text-amber mt-2 flex items-start gap-1.5">
        <Sparkles size={12} className="mt-0.5 shrink-0" /> {rec.action}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-text-muted">First message {rec.draftByAi ? '(AI draft, read before sending)' : '(template, personalise it)'}</p>
          <button onClick={copy} className="inline-flex items-center gap-1 text-[11px] text-amber hover:underline">
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {mailto && (
          <a href={mailto} className="inline-flex items-center gap-1.5 rounded-lg bg-amber text-[#221604] px-3 py-1.5 text-xs font-semibold hover:bg-amber-light">
            <Mail size={12} /> Email {lead.email}
          </a>
        )}
        <a href={rec.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber">
          <ExternalLink size={12} /> Open post
        </a>
        {rec.linkedinSearchUrl && (
          <a href={rec.linkedinSearchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber">
            <Briefcase size={12} /> Find on LinkedIn
          </a>
        )}
        <div className="flex-1" />
        {!done && (
          <>
            <button
              onClick={() => setStatus.mutate({ leadId: lead.id, status: 'contacted' })}
              disabled={setStatus.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success-bg text-success px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Check size={12} /> I contacted them
            </button>
            <button onClick={() => setDismissing((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-faint hover:text-critical">
              <ThumbsDown size={12} /> Not for me
            </button>
          </>
        )}
      </div>

      {dismissing && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DISMISS_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => dismiss.mutate({ leadId: lead.id, reason: r })}
              disabled={dismiss.isPending}
              className="rounded-full border border-border-soft px-3 py-1 text-[11px] hover:border-critical hover:text-critical"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function FollowupCard({ item }: { item: RecItem }) {
  const { lead } = item;
  const setStatus = useSetLeadStatus();
  const rec = recOf(lead);
  return (
    <Card className="p-4 flex items-center gap-3 flex-wrap">
      <MessageCircle size={16} className="text-amber shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{lead.company || lead.name || 'Lead'}</p>
        <p className="text-xs text-text-muted">{item.reason}</p>
      </div>
      {rec?.url && (
        <a href={rec.url} target="_blank" rel="noreferrer" className="text-xs text-amber hover:underline inline-flex items-center gap-1">
          Open <ExternalLink size={11} />
        </a>
      )}
      <button onClick={() => setStatus.mutate({ leadId: lead.id, status: 'replied' })} className="rounded-lg bg-success-bg text-success px-3 py-1.5 text-xs font-semibold">
        They replied
      </button>
      <button onClick={() => setStatus.mutate({ leadId: lead.id, status: 'closed_lost' })} className="rounded-lg px-3 py-1.5 text-xs text-text-faint hover:text-critical">
        Give up
      </button>
    </Card>
  );
}

function SkippedList({ rows }: { rows: { company?: string; title?: string; why?: string; url?: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-semibold">{rows.length} posts skipped after reading them</span>
        <span className="text-xs text-amber">{open ? "Hide" : "Why?"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="text-xs">
              <p className="font-medium">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-amber">
                    {r.company || "Unknown"}
                  </a>
                ) : (
                  r.company || "Unknown"
                )}
                <span className="text-text-faint font-normal"> · {r.title}</span>
              </p>
              <p className="text-text-muted">{r.why}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TargetingPanel() {
  const { data: icp } = useIcp();
  const save = useSaveIcp();
  const [keywords, setKeywords] = useState<string | null>(null);
  const [exclude, setExclude] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  if (!icp) return <LoadingState />;

  const split = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const kw = keywords ?? icp.keywords.join(', ');
  const ex = exclude ?? icp.exclude.join(', ');
  const min = minScore ?? icp.minScore;
  const cnt = count ?? icp.count;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <p className="text-[15px] font-bold">Targeting</p>
        <p className="text-xs text-text-faint">What counts as a good lead for AlphoTech. Changes apply from the next run.</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1">Skills to look for (comma separated)</label>
        <textarea value={kw} onChange={(e) => setKeywords(e.target.value)} rows={3} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber" />
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1">Red flags: heavily penalised when found</label>
        <textarea value={ex} onChange={(e) => setExclude(e.target.value)} rows={2} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">
            Quality bar: {min}/100 <span className="font-normal text-text-faint">(lower shows more, weaker leads)</span>
          </label>
          <input type="range" min={20} max={80} value={min} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-amber" />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Leads per run: {cnt}</label>
          <input type="range" min={3} max={25} value={cnt} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-amber" />
        </div>
      </div>
      <AccentButton
        label={saved ? 'Saved' : 'Save targeting'}
        loading={save.isPending}
        onClick={async () => {
          await save.mutateAsync({ keywords: split(kw), exclude: split(ex), minScore: min, count: cnt });
          setKeywords(null);
          setExclude(null);
          setMinScore(null);
          setCount(null);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
      />
    </Card>
  );
}

function SourceHealth() {
  const { data: stats } = useSourceStats();
  const rows = Object.entries(stats || {});
  if (!rows.length) return null;
  return (
    <Card className="p-5">
      <p className="text-[15px] font-bold">What is working</p>
      <p className="text-xs text-text-faint mb-3">Sources that lead to replies get ranked higher once there are 8+ contacted leads to learn from.</p>
      <div className="space-y-1.5">
        {rows.map(([source, s]) => (
          <div key={source} className="flex items-center gap-3 text-xs">
            <span className="flex-1">{SOURCE_LABEL[source] || source}</span>
            <span className="text-text-faint">{s.total} shown</span>
            <span className="text-text-faint">{s.acted} acted on</span>
            <span className="text-success">{s.positive} replied</span>
            <span className="font-mono-tab w-12 text-right">{s.weight === 1 ? 'neutral' : `x${s.weight}`}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Reddit needs no API to read: these open Reddit's own search in the founder's logged-in browser,
// newest first, last week only. Nothing is scraped or automated, and no password is ever shared.
const RADAR_SUBS = ['forhire', 'SaaS', 'startups', 'webdev', 'Entrepreneur', 'smallbusiness'];
const RADAR_QUERIES = ['looking for developer', 'need backend developer', 'hire freelance developer', 'need automation', 'build MVP'];

const radarUrl = (sub: string, q: string) => `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&t=week`;

function RedditRadar() {
  const [sub, setSub] = useState(RADAR_SUBS[0]);
  return (
    <Card className="p-5">
      <p className="text-[15px] font-bold">Reddit Radar</p>
      <p className="text-xs text-text-faint mb-3">Pick a community, open a search in your own Reddit (logged in as you), then paste a post below to get a reply.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {RADAR_SUBS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`rounded-full border px-3 py-1 text-xs ${s === sub ? 'border-amber text-amber bg-amber/10' : 'border-border-soft text-text-muted hover:border-amber'}`}
          >
            r/{s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {RADAR_QUERIES.map((q) => (
          <a key={q} href={radarUrl(sub, q)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-bg-soft border border-border-soft px-3 py-1.5 text-xs hover:border-amber">
            <ExternalLink size={11} /> {q}
          </a>
        ))}
        {sub === 'forhire' && (
          <a href="https://www.reddit.com/r/forhire/new/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-bg-soft border border-border-soft px-3 py-1.5 text-xs hover:border-amber">
            <ExternalLink size={11} /> newest [HIRING] posts
          </a>
        )}
      </div>
    </Card>
  );
}

const WORTH_META = {
  strong: { label: 'Worth answering', tone: 'success' },
  maybe: { label: 'Maybe', tone: 'warning' },
  no: { label: 'Skip it', tone: 'critical' },
} as const;

function PostAssist() {
  const assist = useAssistReply();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);

  async function run() {
    const r = await assist.mutateAsync({ text, url: url.trim() || undefined });
    setReply(r.reply);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is still selectable in the box */
    }
  }

  const result = assist.data;
  return (
    <Card className="p-5 space-y-3">
      <div>
        <p className="text-[15px] font-bold">Paste a post, get a reply</p>
        <p className="text-xs text-text-faint">Works for any post you find, on Reddit, X or anywhere. You post the reply yourself.</p>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link to the post (optional, so you can jump back to it)"
        className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-xs outline-none focus:border-amber"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste the post title and text here"
        className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber resize-y"
      />
      <AccentButton label="Analyse and draft a reply" icon={Sparkles} loading={assist.isPending} disabled={text.trim().length < 20} onClick={run} />
      {assist.isError && <p className="text-xs text-critical">{(assist.error as Error).message}</p>}
      {result && (
        <div className="rounded-xl border border-border-soft p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={WORTH_META[result.worth].tone}>{WORTH_META[result.worth].label}</Badge>
            <p className="text-xs text-text-muted">{result.need}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-text-muted">Reply (edit, then post it yourself)</p>
            <button onClick={copy} className="inline-flex items-center gap-1 text-[11px] text-amber hover:underline">
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={6} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber resize-y" />
          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber hover:underline">
              <ExternalLink size={12} /> Open the post to comment
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

export function DailyLeadsPage() {
  const { data: plan, isLoading, error, refetch } = useTodayRecs();
  const refresh = useRefreshRecs();
  const [tab, setTab] = useState(0);
  const [showTargeting, setShowTargeting] = useState(false);

  const items = plan?.items || [];
  const todo = items.filter((i) => i.lead.status === 'new');
  const handled = items.filter((i) => i.lead.status !== 'new');
  const shown = tab === 0 ? todo : tab === 1 ? handled : items;
  const stats = plan?.stats;
  const failedSources = Object.entries(stats?.sources || {}).filter(([, s]) => !s.ok);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target size={22} className="text-amber" /> Daily Leads
          </h1>
          <p className="text-sm text-text-muted mt-1">People asking for help and companies hiring for what you sell, ranked, with a first message ready.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTargeting((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm ${showTargeting ? 'border-amber text-amber' : 'border-border-soft text-text-muted'}`}>
            <SlidersHorizontal size={15} /> Targeting
          </button>
          <AccentButton label={plan?.generated ? 'Find more' : "Find today's leads"} icon={plan?.generated ? RefreshCw : Sparkles} loading={refresh.isPending} onClick={() => refresh.mutate()} />
        </div>
      </div>

      {refresh.isPending && (
        <div className="rounded-xl border border-amber/30 bg-amber/8 px-4 py-3 text-xs text-text-muted">
          Reading Hacker News and the job boards, ranking what's there and drafting messages. This takes up to a minute, keep this tab open.
        </div>
      )}
      {refresh.isError && <ErrorState message={(refresh.error as Error).message} onRetry={() => refresh.mutate()} />}

      {showTargeting && <TargetingPanel />}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !plan?.generated ? (
        <Card className="p-8 text-center">
          <Target size={28} className="mx-auto text-amber mb-3" />
          <p className="font-bold">No leads generated yet today</p>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            This runs by itself every morning once the server's scheduled jobs are on. You can also run it now.
          </p>
        </Card>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Posts scanned', stats.fetched],
                ['Good fits', stats.qualified],
                ['Shown to you', items.length],
                ['Already known / skipped', stats.skippedKnown + (stats.rejectedByAi || 0)],
              ].map(([label, value]) => (
                <div key={label as string} className="text-center">
                  <p className="font-mono-tab text-xl font-bold text-amber">{value as number}</p>
                  <p className="text-[11px] text-text-faint">{label as string}</p>
                </div>
              ))}
            </div>
          )}

          {failedSources.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-xs flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
              <p>
                Couldn't read: {failedSources.map(([n]) => SOURCE_LABEL[n] || n).join(', ')}. The rest still ran. Try "Find more" in a few minutes.
              </p>
            </div>
          )}

          {(plan.followups?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[15px] font-bold">Follow up today</p>
              {plan.followups.map((f) => (
                <FollowupCard key={f.leadId} item={f} />
              ))}
            </div>
          )}

          <SkippedList rows={stats?.rejected || []} />

          <TabBar tabs={[`To do (${todo.length})`, `Done (${handled.length})`, 'All']} active={tab} onChange={setTab} />

          {shown.length === 0 ? (
            <EmptyState text={tab === 0 ? 'Nothing left to do. Click "Find more" for another batch.' : 'Nothing here yet.'} />
          ) : (
            <div className="space-y-4">
              {shown.map((i) => (
                <RecCard key={i.leadId} item={i} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <RedditRadar />
        <PostAssist />
      </div>

      <SourceHealth />
    </div>
  );
}
