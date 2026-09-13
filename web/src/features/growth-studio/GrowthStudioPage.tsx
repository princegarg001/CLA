import { useState } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Send,
  Sparkles,
  Image as ImageIcon,
  X,
  AtSign,
  Briefcase,
  Camera,
  Eye,
  Heart,
  BarChart3,
  Users2,
  Search,
  Download,
  ShoppingCart,
  Rocket,
  CalendarClock,
  Check,
  Trash2,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react';
import { usePublish, useUploadImage, useGumroadStats, useTwitterAnalytics, useTwitterScheduled, useGenerateThread, useBetalistSignups, useInstagramInsights, useInstagramMedia } from '../../data/hooks/useGrowth';
import { useSocialStatus } from '../../data/hooks/useSettings';
import { useCalendarEntries, useApproveCalendarEntry, usePublishCalendarEntryNow, useCancelCalendarEntry, useFillWeek } from '../../data/hooks/useCalendar';
import { useRedditOpportunities, useRedditKarma, useDraftRedditReply, useSendRedditReply } from '../../data/hooks/useReddit';
import { Card, TabBar, IconButton, StatCard, Badge, AccentButton, LoadingState, EmptyState, InitialsAvatar } from '../../components/ui';
import { leadDisplayName, type RedditPost } from '../../data/types';

const PLATFORM_DOT: Record<string, string> = { twitter: '#1DA1F2', linkedin: '#0077B5', instagram: '#E1306C', reddit: '#FF4500' };

function AutoPostTab() {
  const { data: status } = useSocialStatus();
  const publish = usePublish();
  const uploadImage = useUploadImage();
  const [text, setText] = useState('');
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(['twitter']));
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<{ platform: string; status: string; message: string }[]>([]);

  const togglePlatform = (key: string, connected: boolean) => {
    if (!connected) return;
    setPlatforms((p) => {
      const next = new Set(p);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  async function handlePublish() {
    if (platforms.size === 0 || !text.trim()) return;
    if (platforms.has('instagram') && !file) return;
    let imageUrl: string | undefined;
    if (file) {
      const r = await uploadImage.mutateAsync(file);
      imageUrl = r.url;
    }
    const r = await publish.mutateAsync({ text: text.trim(), imageUrl, platforms: [...platforms] });
    setResults(
      r.results.map((res) => ({
        platform: res.platform,
        status: res.status,
        message: res.status === 'success' ? 'Published' : res.error || res.reason || 'Failed',
      }))
    );
  }

  const chips: { key: string; label: string; icon: typeof AtSign; connected: boolean }[] = [
    { key: 'twitter', label: 'Twitter/X', icon: AtSign, connected: !!status?.twitter?.connected },
    { key: 'linkedin', label: 'LinkedIn', icon: Briefcase, connected: !!status?.linkedin?.connected },
    { key: 'instagram', label: 'Instagram', icon: Camera, connected: !!status?.instagram?.connected },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-[15px] font-bold">Publish Everywhere</p>
        <p className="text-xs text-text-faint mt-0.5 mb-3.5">One post, every platform you connect below.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="What do you want to announce?"
          className="w-full rounded-xl bg-bg-soft border border-border-soft p-3.5 text-sm outline-none focus:border-amber resize-none"
        />
        <div className="flex items-center gap-2 mt-2.5">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium border border-border-soft rounded-lg px-3 py-1.5 cursor-pointer text-text-muted">
            <ImageIcon size={14} /> {file ? 'Change image' : 'Add image'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && (
            <>
              <span className="text-xs text-text-faint truncate max-w-[140px]">{file.name}</span>
              <button onClick={() => setFile(null)}>
                <X size={14} className="text-text-faint" />
              </button>
            </>
          )}
        </div>
        <p className="text-xs font-semibold text-text-muted mt-4 mb-2">Publish to</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => {
            const selected = platforms.has(c.key);
            return (
              <button
                key={c.key}
                onClick={() => togglePlatform(c.key, c.connected)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  !c.connected
                    ? 'border-border-soft text-text-faint'
                    : selected
                      ? 'border-amber bg-amber/12 text-amber'
                      : 'border-border-soft text-text-muted'
                }`}
              >
                <c.icon size={13} />
                {c.label}
                {!c.connected && <span className="text-[10px]">· connect in Settings</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <AccentButton label="Publish Now" icon={Send} loading={publish.isPending || uploadImage.isPending} onClick={handlePublish} />
        </div>
      </Card>
      {results.length > 0 && (
        <div>
          <p className="text-[15px] font-bold mb-2">Last publish result</p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <Card key={i} className="p-3 flex items-center gap-3">
                {r.status === 'success' ? <Check size={18} className="text-success" /> : <X size={18} className="text-critical" />}
                <div>
                  <p className="text-sm font-semibold">{r.platform[0].toUpperCase() + r.platform.slice(1)}</p>
                  <p className="text-xs text-text-faint">{r.message}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarTab() {
  const { data: entries, isLoading } = useCalendarEntries();
  const approve = useApproveCalendarEntry();
  const publishNow = usePublishCalendarEntryNow();
  const cancel = useCancelCalendarEntry();
  const fillWeek = useFillWeek();

  const statusTone = (s: string): 'success' | 'critical' | 'warning' | 'muted' | 'info' =>
    s === 'posted' ? 'success' : s === 'failed' ? 'critical' : s === 'draft' ? 'warning' : s === 'cancelled' ? 'muted' : 'info';

  return (
    <div className="space-y-4">
      <AccentButton
        label={fillWeek.isPending ? 'Filling…' : 'Fill Week with AI'}
        icon={Sparkles}
        loading={fillWeek.isPending}
        onClick={() => fillWeek.mutate()}
      />
      {!entries?.length && isLoading ? (
        <LoadingState />
      ) : !entries?.length ? (
        <EmptyState text="Nothing on the calendar yet." />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {e.platforms.map((p) => (
                    <span key={p} className="h-2 w-2 rounded-full" style={{ background: PLATFORM_DOT[p] || '#71828C' }} />
                  ))}
                </div>
                <p className="text-xs text-text-faint flex-1">
                  {new Date(e.scheduled_for).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {e.ai_generated && <Sparkles size={13} className="text-amber" />}
                <Badge tone={statusTone(e.status)}>{e.status}</Badge>
              </div>
              <p className="text-sm mt-2 line-clamp-3">{e.content || '(no text — media only)'}</p>
              {e.results.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {e.results.map((r, i) => (
                    <p key={i} className="text-[11px] text-text-faint">
                      {r.platform}: {r.status === 'success' ? 'Published' : r.error || r.reason || r.status}
                    </p>
                  ))}
                </div>
              )}
              {['draft', 'scheduled', 'failed'].includes(e.status) && (
                <div className="flex gap-2 mt-3">
                  {e.status === 'draft' && (
                    <button onClick={() => approve.mutate(e.id)} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                      <Check size={12} /> Approve
                    </button>
                  )}
                  <button onClick={() => publishNow.mutate(e.id)} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                    <Send size={12} /> Publish Now
                  </button>
                  <button onClick={() => cancel.mutate(e.id)} className="flex-1 rounded-lg border border-critical/40 text-critical py-1.5 text-xs font-medium flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Cancel
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

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

function InstagramTab() {
  const { data: insights, isLoading } = useInstagramInsights();
  const { data: media } = useInstagramMedia();

  if (isLoading && !insights) return <LoadingState />;
  return (
    <div className="space-y-4">
      {insights && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Eye} label="Reach" value={`${insights.reach}`} />
            <StatCard icon={BarChart3} label="Impressions" value={`${insights.impressions}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users2} label="Followers" value={`${insights.followerCount ?? '—'}`} />
            <StatCard icon={Search} label="Profile Views" value={`${insights.profileViews}`} />
          </div>
          {insights.sample && <Badge tone="warning">Sample data — connect Instagram in Settings</Badge>}
        </>
      )}
      <p className="text-[15px] font-bold">Recent Posts</p>
      {!media?.length ? (
        <EmptyState text="No posts yet." />
      ) : (
        <div className="space-y-2">
          {media.map((m) => (
            <Card key={m.id} className="p-3 flex gap-3">
              <div className="h-11 w-11 rounded-lg bg-[#E1306C1F] flex items-center justify-center shrink-0 overflow-hidden">
                {m.thumbnailUrl ? <img src={m.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <Camera size={18} color="#E1306C" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs line-clamp-2">{m.caption || '(no caption)'}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-faint">
                  <span className="flex items-center gap-1">
                    <Heart size={11} /> {m.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={11} /> {m.commentsCount}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TwitterTab() {
  const { data: analytics } = useTwitterAnalytics();
  const { data: scheduled } = useTwitterScheduled();
  const generateThread = useGenerateThread();
  const [topic, setTopic] = useState('');
  const [thread, setThread] = useState<string[] | null>(null);

  const topTweets = analytics?.topTweets || [];

  return (
    <div className="space-y-4">
      <p className="text-[15px] font-bold">Scheduled Posts</p>
      {!scheduled?.length ? (
        <EmptyState text="Nothing scheduled yet." />
      ) : (
        <div className="space-y-2">
          {scheduled.map((p) => (
            <Card key={p.id} className="p-3.5">
              <div className="flex items-center gap-2">
                <CalendarClock size={15} className={p.status === 'scheduled' ? 'text-success' : 'text-warning'} />
                <p className="text-xs text-text-faint flex-1">{p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : ''}</p>
                <Badge tone={p.status === 'scheduled' ? 'success' : 'warning'}>{p.status}</Badge>
              </div>
              <p className="text-sm mt-2 line-clamp-2">{p.content}</p>
            </Card>
          ))}
        </div>
      )}

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

export function GrowthStudioPage() {
  const [tab, setTab] = useState(0);
  const { data: twitterAnalytics } = useTwitterAnalytics();
  const { data: gumroadStats } = useGumroadStats();
  const { data: calendarEntries } = useCalendarEntries();
  const { data: betalist } = useBetalistSignups();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={22} className="text-amber" /> Growth Studio
          </h1>
          <p className="text-sm text-text-muted mt-1">Publish, schedule, and track every growth channel from one place.</p>
        </div>
        <IconButton icon={RefreshCw} onClick={() => window.location.reload()} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Followers', twitterAnalytics?.followers ?? 0],
          ['Downloads', gumroadStats?.totalDownloads ?? 0],
          ['Scheduled', calendarEntries?.length ?? 0],
          ['Signups', betalist?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className="font-mono-tab text-xl font-bold text-amber">{value as number}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={['Auto-Post', 'Calendar', 'Reddit', 'Instagram', 'Twitter/X', 'Gumroad', 'BetaList']} active={tab} onChange={setTab} />

      {tab === 0 && <AutoPostTab />}
      {tab === 1 && <CalendarTab />}
      {tab === 2 && <RedditTab />}
      {tab === 3 && <InstagramTab />}
      {tab === 4 && <TwitterTab />}
      {tab === 5 && <GumroadTab />}
      {tab === 6 && <BetaListTab />}
    </div>
  );
}
