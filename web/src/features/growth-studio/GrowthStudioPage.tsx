import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  RefreshCw,
  Send,
  Sparkles,
  Eye,
  Heart,
  Download,
  ShoppingCart,
  Rocket,
  Trash2,
  ArrowUpRight,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useGumroadStats, useTwitterAnalytics, useGenerateThread, useBetalistSignups } from '../../data/hooks/useGrowth';
import { useSocialStatus } from '../../data/hooks/useSettings';
import { useCalendarEntries } from '../../data/hooks/useCalendar';
import { useDeleteMedia, useMediaLibrary } from '../../data/hooks/useStudio';
import { useRedditOpportunities, useRedditKarma, useDraftRedditReply, useSendRedditReply } from '../../data/hooks/useReddit';
import { Card, TabBar, IconButton, StatCard, Badge, AccentButton, LoadingState, EmptyState, InitialsAvatar } from '../../components/ui';
import { Composer, type ComposerSeed } from './Composer';
import { CalendarView } from './CalendarView';
import { MediaThumb, fmtBytes } from './MediaUploader';
import { leadDisplayName, type RedditPost } from '../../data/types';

function RedditReplyBox({ post }: { post: RedditPost }) {
  const draftReply = useDraftRedditReply();
  const sendReply = useSendRedditReply();
  const [draft, setDraft] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="mt-3">
      {draft == null ? (
        <button
          onClick={async () => setDraft((await draftReply.mutateAsync(post)).draft)}
          disabled={draftReply.isPending}
          className="w-full rounded-lg border border-amber/40 text-amber py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles size={12} /> {draftReply.isPending ? 'Drafting…' : 'Generate AI Reply'}
        </button>
      ) : (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none" />
          <button
            onClick={async () => {
              if (!draft.trim()) return;
              await sendReply.mutateAsync({ post, text: draft.trim() });
              setSent(true);
            }}
            disabled={sendReply.isPending || sent}
            className="w-full mt-2 rounded-lg bg-amber text-[#221604] py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send size={12} /> {sent ? 'Posted' : 'Post Reply'}
          </button>
        </>
      )}
    </div>
  );
}

function RedditTab() {
  const { data: opportunities, isLoading } = useRedditOpportunities();
  const { data: karma } = useRedditKarma();

  return (
    <div className="space-y-4">
      {karma && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={MessageSquare} label="Comment Karma" value={`${karma.commentKarma}`} />
          <StatCard icon={TrendingUp} label="Link Karma" value={`${karma.linkKarma}`} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold">Lead Opportunities</p>
        {karma?.sample && <Badge tone="warning">Sample data</Badge>}
      </div>
      {!opportunities?.length && isLoading ? (
        <LoadingState />
      ) : !opportunities?.length ? (
        <EmptyState text="No matching posts right now." />
      ) : (
        <div className="space-y-3">
          {opportunities.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: '#FF45001F', color: '#FF4500' }}>
                  r/{post.subreddit}
                </span>
                <div className="flex-1" />
                {post.keywordScore > 0 && <Badge tone="warning">Fit {post.keywordScore}/10</Badge>}
              </div>
              <p className="font-bold text-sm mt-2">{post.title}</p>
              {post.body && <p className="text-xs text-text-muted mt-1 line-clamp-3">{post.body}</p>}
              <div className="flex items-center gap-4 mt-2 text-xs text-text-faint">
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={12} /> {post.score}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} /> {post.numComments}
                </span>
              </div>
              <RedditReplyBox post={post} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TwitterTab({ onUseThread }: { onUseThread: (tweets: string[]) => void }) {
  const { data: analytics } = useTwitterAnalytics();
  const generateThread = useGenerateThread();
  const [topic, setTopic] = useState('');
  const [thread, setThread] = useState<string[] | null>(null);

  const topTweets = analytics?.topTweets || [];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-[15px] font-bold">Generate a Thread</p>
        <p className="text-xs text-text-faint mt-0.5 mb-3">AI writes a full thread in your voice</p>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='Topic: e.g. "Cost of bad backend architecture"'
          className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 text-sm outline-none focus:border-amber"
        />
        <div className="mt-3">
          <AccentButton
            label="Generate Thread"
            icon={Sparkles}
            loading={generateThread.isPending}
            onClick={async () => {
              if (!topic.trim()) return;
              const r = await generateThread.mutateAsync(topic.trim());
              setThread(r.tweets);
            }}
          />
        </div>
        {thread && (
          <div className="mt-3 space-y-2">
            {thread.map((t, i) => (
              <div key={i} className="rounded-lg bg-bg-soft p-2.5 text-xs">
                {t}
              </div>
            ))}
            <button
              onClick={() => onUseThread(thread)}
              className="w-full rounded-lg border border-amber/50 text-amber py-2 text-xs font-semibold hover:bg-amber/10"
            >
              Edit and schedule this thread in the composer
            </button>
          </div>
        )}
      </Card>

      <p className="text-[15px] font-bold">What's Working</p>
      {topTweets.length === 0 ? (
        <EmptyState text="No tweet performance data yet." />
      ) : (
        <div className="space-y-2">
          {topTweets.map((t, i) => (
            <Card key={i} className="p-3.5">
              <p className="text-sm line-clamp-3">{String(t.text || '')}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-text-faint">
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {String(t.impressions || 0)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {String(t.engagements || 0)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GumroadTab() {
  const { data: stats } = useGumroadStats();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Download} label="Total Downloads" value={`${stats?.totalDownloads ?? 0}`} />
        <StatCard icon={ShoppingCart} label="Sales" value={`${stats?.salesCount ?? 0}`} />
      </div>
      <p className="text-[15px] font-bold">Resources</p>
      {!stats?.products.length ? (
        <EmptyState text="No resources yet." />
      ) : (
        <div className="space-y-2">
          {stats.products.map((p, i) => (
            <Card key={i} className="p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FF90A426', color: '#FF6B8A' }}>
                <Download size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-text-faint">
                  {p.downloads} downloads • {p.price === 0 ? 'Free' : `$${p.price}`}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BetaListTab() {
  const { data: signups } = useBetalistSignups();
  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber/12 text-amber flex items-center justify-center">
          <Rocket size={16} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">AlphoTech SaaS Listing</p>
          <p className="text-xs text-text-faint">{signups?.length || 0} signups captured</p>
        </div>
        <Badge tone="success">Live</Badge>
      </Card>
      <p className="text-[15px] font-bold">Recent Signups</p>
      {!signups?.length ? (
        <EmptyState text="No signups yet." />
      ) : (
        <div className="space-y-2">
          {signups.map((s) => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <InitialsAvatar name={leadDisplayName(s)} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{leadDisplayName(s)}</p>
                <p className="text-xs text-text-faint truncate">{s.email || s.intent_signal || ''}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-amber/10 text-amber shrink-0">Score {s.score}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryTab() {
  const { data, isLoading } = useMediaLibrary();
  const del = useDeleteMedia();
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState text="Nothing uploaded yet. Add images or video in the composer." />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {data.map((m) => (
        <Card key={m.path || m.url} className="overflow-hidden group relative">
          <MediaThumb item={m} className="h-32 w-full" />
          <div className="p-2.5">
            <p className="text-xs truncate">{m.name}</p>
            <p className="text-[10px] text-text-faint">
              {m.type} · {fmtBytes(m.size)}
            </p>
          </div>
          <button
            onClick={() => m.path && window.confirm(`Delete ${m.name}? Scheduled posts using it will fail.`) && del.mutate(m.path)}
            className="absolute top-2 right-2 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-critical"
            title="Delete permanently"
          >
            <Trash2 size={13} />
          </button>
        </Card>
      ))}
    </div>
  );
}

const TABS = ['Compose', 'Calendar', 'Reddit', 'Twitter/X', 'Library', 'Gumroad', 'BetaList'];

export function GrowthStudioPage() {
  const [tab, setTab] = useState(0);
  const [seed, setSeed] = useState<ComposerSeed | undefined>(undefined);
  const [composerKey, setComposerKey] = useState(0);
  const { data: status } = useSocialStatus();
  const { data: calendarEntries } = useCalendarEntries();
  const { data: betalist } = useBetalistSignups();

  function compose(next?: ComposerSeed) {
    setSeed(next);
    setComposerKey((k) => k + 1);
    setTab(0);
  }

  const entries = calendarEntries || [];
  const upcoming = entries.filter((e) => e.status === 'scheduled').length;
  const drafts = entries.filter((e) => e.status === 'draft').length;
  const needsAttention = entries.filter((e) => e.status === 'failed' || e.status === 'partial').length;
  const linkedinDays = status?.linkedin.daysLeft;
  const linkedinWarn = !!status?.linkedin.connected && (!!status.linkedin.expired || (linkedinDays != null && linkedinDays <= 7));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={22} className="text-amber" /> Growth Studio
          </h1>
          <p className="text-sm text-text-muted mt-1">Write once, tailor per platform, schedule it, and track what lands.</p>
        </div>
        <IconButton icon={RefreshCw} onClick={() => window.location.reload()} />
      </div>

      {linkedinWarn && (
        <div className="rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-xs flex items-center gap-2.5">
          <AlertTriangle size={15} className="text-warning shrink-0" />
          <p>
            {status?.linkedin.expired
              ? 'Your LinkedIn connection has expired. Scheduled LinkedIn posts will fail until you reconnect.'
              : `Your LinkedIn connection expires in ${linkedinDays} day${linkedinDays === 1 ? '' : 's'}. Reconnect before then so scheduled posts keep going out.`}{' '}
            <Link to="/settings" className="text-amber font-semibold hover:underline">
              Reconnect in Settings
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Scheduled', upcoming],
          ['Drafts', drafts],
          ['Need attention', needsAttention],
          ['Signups', betalist?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className={`font-mono-tab text-xl font-bold ${label === 'Need attention' && (value as number) > 0 ? 'text-critical' : 'text-amber'}`}>{value as number}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 0 && <Composer key={composerKey} seed={seed} />}
      {tab === 1 && <CalendarView onCompose={(d) => compose(d ? { when: d } : undefined)} />}
      {tab === 2 && <RedditTab />}
      {tab === 3 && <TwitterTab onUseThread={(tweets) => compose({ content: tweets.join('\n\n'), platforms: ['twitter'], postType: 'thread' })} />}
      {tab === 4 && <LibraryTab />}
      {tab === 5 && <GumroadTab />}
      {tab === 6 && <BetaListTab />}
    </div>
  );
}
