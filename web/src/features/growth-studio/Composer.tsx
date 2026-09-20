import { useMemo, useState } from 'react';
import {
  AtSign,
  Briefcase,
  MessageSquare,
  Sparkles,
  Send,
  CalendarClock,
  FileText,
  AlertTriangle,
  CircleAlert,
  Check,
  ChevronDown,
  ExternalLink,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { MediaUploader, MediaThumb } from './MediaUploader';
import { ResultsList, PLATFORM_META } from './ResultsList';
import { useSocialStatus } from '../../data/hooks/useSettings';
import { useAiVariants, useBrandVoice, useSaveBrandVoice, useSubredditInfo, useValidation } from '../../data/hooks/useStudio';
import { useCreateEntry, useUpdateEntry, usePublishCalendarEntryNow, type EntryInput } from '../../data/hooks/useCalendar';
import { formatWhen, localTimezone, suggestedSlots, toLocalInput } from '../../core/timeSlots';
import type { CalendarEntry, MediaItem, PlatformVariant, SocialPlatform, Variants } from '../../data/types';

export interface ComposerSeed {
  content?: string;
  platforms?: SocialPlatform[];
  variants?: Variants;
  media?: MediaItem[];
  postType?: string;
  when?: Date;
}

const PLATFORMS: { key: SocialPlatform; icon: LucideIcon }[] = [
  { key: 'twitter', icon: AtSign },
  { key: 'linkedin', icon: Briefcase },
  { key: 'reddit', icon: MessageSquare },
];
const KNOWN = PLATFORMS.map((p) => p.key) as string[];

type Mode = 'now' | 'schedule' | 'draft';

function cleanVariants(variants: Variants, platforms: string[]): Variants {
  const out: Variants = {};
  for (const p of platforms) {
    const v = variants[p];
    if (!v) continue;
    const entries = Object.entries(v).filter(([, val]) => val !== undefined && val !== null && val !== '');
    if (entries.length) out[p] = Object.fromEntries(entries) as PlatformVariant;
  }
  return out;
}

function autoRedditKind(media: MediaItem[], v?: PlatformVariant): 'self' | 'link' | 'image' {
  if (media.length) return 'image';
  if (v?.linkUrl) return 'link';
  return 'self';
}

function Counter({ length, limit }: { length: number; limit: number }) {
  const over = length > limit;
  const near = !over && length > limit * 0.9;
  return (
    <span className={`font-mono-tab text-[11px] ${over ? 'text-critical font-semibold' : near ? 'text-warning' : 'text-text-faint'}`}>
      {length}/{limit}
    </span>
  );
}

const areaClass =
  'w-full rounded-xl bg-bg-soft border border-border-soft p-3 text-sm outline-none focus:border-amber resize-y transition-colors';
const inputClass =
  'w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber transition-colors';

function PreviewCard({
  platform,
  text,
  media,
  variant,
  postType,
  name,
}: {
  platform: SocialPlatform;
  text: string;
  media: MediaItem[];
  variant?: PlatformVariant;
  postType: string;
  name: string;
}) {
  const meta = PLATFORM_META[platform];
  const images = media.filter((m) => m.type !== 'video');
  const video = media.find((m) => m.type === 'video');
  const thread = platform === 'twitter' && postType === 'thread' ? text.split(/\n\s*\n/).filter((t) => t.trim()) : null;
  const body = thread ? thread[0] || '' : text;

  return (
    <div className="rounded-xl border border-border-soft bg-bg-soft p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-[#0B1826] font-bold text-xs" style={{ background: meta.color }}>
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold">{name}</p>
          <p className="text-[10px] text-text-faint">
            {meta.label}
            {platform === 'reddit' && variant?.subreddit ? ` · r/${variant.subreddit.replace(/^r\//i, '')}` : ''}
          </p>
        </div>
      </div>
      {platform === 'reddit' && <p className="text-sm font-bold mb-1">{variant?.title || <span className="text-text-faint italic">Add a title</span>}</p>}
      <p className={`text-[13px] whitespace-pre-wrap leading-relaxed ${platform === 'linkedin' ? 'line-clamp-6' : 'line-clamp-8'}`}>
        {body || <span className="text-text-faint italic">Nothing to show yet</span>}
      </p>
      {thread && thread.length > 1 && <p className="text-[11px] text-text-faint mt-1.5">+ {thread.length - 1} more tweet{thread.length > 2 ? 's' : ''} in the thread</p>}
      {platform === 'linkedin' && variant?.linkUrl && !media.length && (
        <div className="mt-2 rounded-lg border border-border-soft px-2.5 py-2 text-[11px] text-text-muted flex items-center gap-1.5 truncate">
          <ExternalLink size={11} /> {variant.linkUrl}
        </div>
      )}
      {platform === 'reddit' && variant?.kind === 'link' && variant.linkUrl && (
        <div className="mt-2 rounded-lg border border-border-soft px-2.5 py-2 text-[11px] text-amber flex items-center gap-1.5 truncate">
          <ExternalLink size={11} /> {variant.linkUrl}
        </div>
      )}
      {video && platform !== 'reddit' && <MediaThumb item={video} className="mt-2 h-32 w-full rounded-lg" />}
      {!video && images.length > 0 && (platform !== 'reddit' || (variant?.kind ?? autoRedditKind(media, variant)) === 'image') && (
        <div className={`mt-2 grid gap-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.slice(0, platform === 'reddit' ? 1 : 4).map((m) => (
            <MediaThumb key={m.url} item={m} className={`w-full rounded-lg ${images.length === 1 ? 'max-h-52' : 'h-24'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Composer({ initial, seed, onDone }: { initial?: CalendarEntry; seed?: ComposerSeed; onDone?: () => void }) {
  const { data: status } = useSocialStatus();
  const { data: savedVoice } = useBrandVoice();
  const saveVoice = useSaveBrandVoice();
  const ai = useAiVariants();
  const create = useCreateEntry();
  const update = useUpdateEntry();
  const publish = usePublishCalendarEntryNow();
  const slots = useMemo(() => suggestedSlots(), []);

  const [base, setBase] = useState(initial?.content ?? seed?.content ?? '');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(
    ((initial?.platforms ?? seed?.platforms ?? ['twitter', 'linkedin']).filter((p) => KNOWN.includes(p)) as SocialPlatform[])
  );
  const [variants, setVariants] = useState<Variants>(initial?.raw?.variants ?? seed?.variants ?? {});
  const [media, setMedia] = useState<MediaItem[]>(
    initial?.raw?.media ?? (initial?.media_urls?.length ? initial.media_urls.map((url) => ({ url, type: 'image' as const })) : seed?.media ?? [])
  );
  const [postType, setPostType] = useState(initial?.post_type ?? seed?.postType ?? 'post');
  const [mode, setMode] = useState<Mode>(initial ? (initial.status === 'draft' ? 'draft' : 'schedule') : 'schedule');
  const [when, setWhen] = useState(toLocalInput(initial ? new Date(initial.scheduled_for) : seed?.when ?? slots[0].when));
  const [idea, setIdea] = useState('');
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarEntry | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const cleaned = useMemo(() => cleanVariants(variants, platforms), [variants, platforms]);
  const validation = useValidation({ content: base, platforms, postType, media, variants: cleaned });
  const v = validation.data;
  const checking = validation.isFetching;
  const busy = create.isPending || update.isPending || publish.isPending;
  const redditVariant = variants.reddit;
  const subInfo = useSubredditInfo(redditVariant?.subreddit ?? '');
  const authorName = status?.linkedin.accountName || 'AlphoTech';

  const connected: Record<SocialPlatform, boolean> = {
    twitter: !!status?.twitter.connected,
    linkedin: !!status?.linkedin.connected,
    reddit: !!status?.reddit.connected,
  };
  const disconnectedPicked = platforms.filter((p) => !connected[p]);

  const textFor = (p: SocialPlatform) => variants[p]?.text ?? base;
  const isCustom = (p: SocialPlatform) => variants[p]?.text !== undefined;
  const setVariant = (p: SocialPlatform, patch: Partial<PlatformVariant>) => setVariants((cur) => ({ ...cur, [p]: { ...cur[p], ...patch } }));
  const uncustomize = (p: SocialPlatform) =>
    setVariants((cur) => {
      const rest = { ...(cur[p] || {}) };
      delete rest.text;
      return { ...cur, [p]: rest };
    });

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function draftWithAi() {
    setError(null);
    setAiNote(null);
    if (!idea.trim() && !base.trim()) {
      setError('Give the AI an idea or a rough draft to work from.');
      return;
    }
    if (!platforms.length) {
      setError('Pick at least one platform first.');
      return;
    }
    try {
      const r = await ai.mutateAsync({
        topic: idea.trim() || undefined,
        baseText: base.trim() || undefined,
        platforms,
        subreddits: status?.reddit.monitoredSubs,
      });
      setVariants((cur) => ({ ...cur, ...r.variants }));
      if (!base.trim()) setBase(r.variants.linkedin?.text ?? Object.values(r.variants)[0]?.text ?? '');
      setAiNote(r.ai ? 'Drafted for each platform — read them over before posting.' : 'AI is unavailable right now, so these are trimmed copies of your draft.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function reset() {
    setBase('');
    setVariants({});
    setMedia([]);
    setPostType('post');
    setIdea('');
    setAiNote(null);
    setResult(null);
    setError(null);
  }

  async function submit() {
    setError(null);
    setResult(null);
    const scheduledFor = new Date(when);
    if (mode === 'schedule' && (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now() - 60000)) {
      setError('Pick a time in the future.');
      return;
    }
    const input: EntryInput = {
      content: base,
      platforms,
      postType,
      media,
      variants: cleaned,
      timezone: localTimezone(),
      scheduledFor: Number.isNaN(scheduledFor.getTime()) ? undefined : scheduledFor.toISOString(),
    };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...input, status: mode === 'draft' ? 'draft' : 'scheduled' });
        if (mode === 'now') setResult(await publish.mutateAsync(initial.id));
        else onDone?.();
      } else {
        const entry = await create.mutateAsync({ ...input, status: mode === 'draft' ? 'draft' : 'scheduled', publishNow: mode === 'now' });
        if (mode === 'now') setResult(entry);
        else {
          setResult(entry);
          if (onDone) onDone();
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const primaryLabel = mode === 'now' ? 'Publish now' : mode === 'schedule' ? (initial ? 'Save & schedule' : 'Schedule post') : initial ? 'Save draft' : 'Save draft';
  const blocked = mode !== 'draft' && (!v?.ok || checking || !platforms.length);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ------------------------------------------------------------ editor */}
      <div className="lg:col-span-3 space-y-4">
        {!initial && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Wand2 size={15} className="text-amber" />
              <p className="text-sm font-bold">Start from an idea</p>
              <button onClick={() => setVoiceOpen((o) => !o)} className="ml-auto text-[11px] text-text-faint hover:text-amber inline-flex items-center gap-1">
                Brand voice <ChevronDown size={12} className={voiceOpen ? 'rotate-180' : ''} />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && draftWithAi()}
                placeholder='e.g. "Why most MVPs outgrow their backend in 6 months"'
                className={inputClass}
              />
              <button
                onClick={draftWithAi}
                disabled={ai.isPending}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber/15 text-amber px-3.5 text-sm font-semibold disabled:opacity-50"
              >
                <Sparkles size={14} /> {ai.isPending ? 'Drafting…' : 'Draft'}
              </button>
            </div>
            {aiNote && <p className="text-[11px] text-text-muted mt-2">{aiNote}</p>}
            {voiceOpen && (
              <div className="mt-3">
                <p className="text-[11px] text-text-faint mb-1.5">Paste 3–5 posts you've written. Every AI draft matches this voice.</p>
                <textarea
                  rows={5}
                  value={voiceDraft ?? savedVoice ?? ''}
                  onChange={(e) => setVoiceDraft(e.target.value)}
                  className={areaClass}
                  placeholder="Your best past posts…"
                />
                <button
                  onClick={() => saveVoice.mutate(voiceDraft ?? savedVoice ?? '', { onSuccess: () => setVoiceDraft(null) })}
                  disabled={voiceDraft === null || saveVoice.isPending}
                  className="mt-2 rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber disabled:opacity-40"
                >
                  {saveVoice.isPending ? 'Saving…' : voiceDraft === null && savedVoice ? 'Saved' : 'Save voice'}
                </button>
              </div>
            )}
          </Card>
        )}

        <Card className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-text-muted mb-2">Post to</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ key, icon: Icon }) => {
                const on = platforms.includes(key);
                const meta = PLATFORM_META[key];
                return (
                  <button
                    key={key}
                    onClick={() => togglePlatform(key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      on ? 'border-amber bg-amber/12 text-amber' : 'border-border-soft text-text-muted hover:border-border'
                    }`}
                  >
                    <Icon size={13} />
                    {meta.label}
                    <span className={`h-1.5 w-1.5 rounded-full ${connected[key] ? 'bg-success' : 'bg-critical'}`} title={connected[key] ? 'Connected' : 'Not connected'} />
                  </button>
                );
              })}
            </div>
            {disconnectedPicked.length > 0 && (
              <p className="text-[11px] text-warning mt-2 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                {disconnectedPicked.map((p) => PLATFORM_META[p].label).join(', ')} {disconnectedPicked.length > 1 ? "aren't" : "isn't"} connected — you can save, but it can't send until it is.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-muted">Your post</label>
              <span className="text-[11px] text-text-faint">Shared by every platform unless you customize it below</span>
            </div>
            <textarea
              value={base}
              onChange={(e) => setBase(e.target.value)}
              rows={6}
              placeholder="What do you want to say?"
              className={areaClass}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted mb-2">Media</p>
            <MediaUploader media={media} onChange={setMedia} />
          </div>
        </Card>

        {platforms.map((p) => {
          const meta = PLATFORM_META[p];
          const pv = v?.platforms[p];
          const counter = pv?.text;
          return (
            <Card key={p} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                <p className="text-sm font-bold">{meta.label}</p>
                {counter && <Counter length={counter.length} limit={counter.limit} />}
                <label className="ml-auto flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustom(p)}
                    onChange={(e) => (e.target.checked ? setVariant(p, { text: base }) : uncustomize(p))}
                    className="accent-[#F5A623]"
                  />
                  Customize wording
                </label>
              </div>

              {p === 'reddit' ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Subreddit</label>
                      <div className="flex items-center">
                        <span className="rounded-l-lg border border-r-0 border-border-soft bg-surface-hover px-2.5 py-2 text-sm text-text-faint">r/</span>
                        <input
                          list="cla-subs"
                          value={(redditVariant?.subreddit ?? '').replace(/^r\//i, '')}
                          onChange={(e) => setVariant('reddit', { subreddit: e.target.value })}
                          placeholder="SaaS"
                          className={`${inputClass} rounded-l-none`}
                        />
                        <datalist id="cla-subs">
                          {(status?.reddit.monitoredSubs || []).map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Post type</label>
                      <div className="flex rounded-lg border border-border-soft overflow-hidden text-xs font-medium">
                        {(['self', 'link', 'image'] as const).map((k) => {
                          const active = (redditVariant?.kind ?? autoRedditKind(media, redditVariant)) === k;
                          return (
                            <button
                              key={k}
                              onClick={() => setVariant('reddit', { kind: k })}
                              className={`flex-1 py-2 ${active ? 'bg-amber/15 text-amber' : 'text-text-muted hover:bg-surface-hover'}`}
                            >
                              {k === 'self' ? 'Text' : k === 'link' ? 'Link' : 'Image'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {subInfo.data && (
                    <div className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 text-[11px] text-text-muted">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text">r/{subInfo.data.name}</span>
                        {subInfo.data.subscribers != null && <span>{subInfo.data.subscribers.toLocaleString()} members</span>}
                        {subInfo.data.submissionType !== 'any' && <Badge tone="warning">{subInfo.data.submissionType} posts only</Badge>}
                        {subInfo.data.over18 && <Badge tone="critical">NSFW</Badge>}
                        {subInfo.data.sample && <Badge tone="muted">sample — connect Reddit</Badge>}
                        {subInfo.data.rules.length > 0 && (
                          <button onClick={() => setRulesOpen((o) => !o)} className="ml-auto text-amber hover:underline">
                            {rulesOpen ? 'Hide' : 'Read'} {subInfo.data.rules.length} rules
                          </button>
                        )}
                      </div>
                      {rulesOpen && (
                        <ul className="mt-2 space-y-1.5">
                          {subInfo.data.rules.map((r, i) => (
                            <li key={i}>
                              <span className="font-semibold text-text">{i + 1}. {r.name}</span>
                              {r.description && <span> — {r.description}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {subInfo.data && subInfo.data.flairs.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Flair</label>
                      <select
                        value={redditVariant?.flairId ?? ''}
                        onChange={(e) => setVariant('reddit', { flairId: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">No flair</option>
                        {subInfo.data.flairs.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-text-muted">Title</label>
                      <button
                        onClick={() => setVariant('reddit', { title: (textFor('reddit').split('\n')[0] || '').slice(0, 300) })}
                        className="text-[11px] text-amber hover:underline"
                      >
                        Use first line of post
                      </button>
                    </div>
                    <input value={redditVariant?.title ?? ''} onChange={(e) => setVariant('reddit', { title: e.target.value })} className={inputClass} placeholder="A clear, specific title" />
                  </div>

                  {(redditVariant?.kind ?? autoRedditKind(media, redditVariant)) === 'link' && (
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Link</label>
                      <input value={redditVariant?.linkUrl ?? ''} onChange={(e) => setVariant('reddit', { linkUrl: e.target.value })} className={inputClass} placeholder="https://…" />
                    </div>
                  )}

                  {(redditVariant?.kind ?? autoRedditKind(media, redditVariant)) === 'self' && (
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Body</label>
                      {isCustom('reddit') ? (
                        <textarea rows={5} value={variants.reddit?.text ?? ''} onChange={(e) => setVariant('reddit', { text: e.target.value })} className={areaClass} />
                      ) : (
                        <p className="text-xs text-text-faint rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 whitespace-pre-wrap line-clamp-4">
                          {base || 'Uses your post text above.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {isCustom(p) ? (
                    <textarea rows={p === 'twitter' ? 4 : 6} value={variants[p]?.text ?? ''} onChange={(e) => setVariant(p, { text: e.target.value })} className={areaClass} />
                  ) : (
                    <p className="text-xs text-text-faint rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 whitespace-pre-wrap line-clamp-4">
                      {base || 'Uses your post text above.'}
                    </p>
                  )}
                  {p === 'twitter' && (
                    <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={postType === 'thread'}
                        onChange={(e) => setPostType(e.target.checked ? 'thread' : 'post')}
                        className="accent-[#F5A623]"
                      />
                      Post as a thread — a blank line starts the next tweet
                    </label>
                  )}
                  {p === 'linkedin' && (
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-1">Link preview (optional)</label>
                      <input
                        value={variants.linkedin?.linkUrl ?? ''}
                        onChange={(e) => setVariant('linkedin', { linkUrl: e.target.value })}
                        className={inputClass}
                        placeholder="https://… (can't be combined with images/video)"
                      />
                    </div>
                  )}
                </div>
              )}
              {pv && pv.errors.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {pv.errors.map((e, i) => (
                    <li key={i} className="text-[11px] text-critical flex items-start gap-1.5">
                      <CircleAlert size={12} className="shrink-0 mt-0.5" /> {e.message}
                    </li>
                  ))}
                </ul>
              )}
              {pv && pv.warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pv.warnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-warning flex items-start gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}

        {/* ---------------------------------------------------------- send */}
        <Card className="p-4">
          <div className="flex rounded-xl border border-border-soft overflow-hidden text-xs font-semibold mb-3.5">
            {(
              [
                ['now', 'Publish now', Send],
                ['schedule', 'Schedule', CalendarClock],
                ['draft', 'Save as draft', FileText],
              ] as [Mode, string, LucideIcon][]
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 ${mode === m ? 'bg-amber/15 text-amber' : 'text-text-muted hover:bg-surface-hover'}`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {mode !== 'now' && (
            <div className="mb-3.5">
              <label className="text-[11px] font-semibold text-text-muted block mb-1">{mode === 'draft' ? 'Planned time (optional)' : 'Send at'}</label>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} />
              <div className="flex flex-wrap gap-2 mt-2">
                {slots.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setWhen(toLocalInput(s.when))}
                    className="rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-text-muted hover:border-amber hover:text-amber"
                    title={formatWhen(s.when.toISOString())}
                  >
                    {s.label} · {formatWhen(s.when.toISOString())}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-faint mt-1.5">Times are in your timezone ({localTimezone()}).</p>
            </div>
          )}

          {v && v.errors.length > 0 && mode !== 'draft' && (
            <p className="text-[11px] text-critical mb-2.5 flex items-center gap-1.5">
              <CircleAlert size={12} /> Fix {v.errors.length} issue{v.errors.length > 1 ? 's' : ''} above before you can {mode === 'now' ? 'publish' : 'schedule'}.
            </p>
          )}
          {error && <p className="text-xs text-critical mb-2.5">{error}</p>}

          <button
            onClick={submit}
            disabled={busy || blocked}
            className="w-full rounded-xl bg-amber text-[#221604] font-semibold py-3 text-sm hover:bg-amber-light transition-colors disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {busy ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : mode === 'now' ? (
              <Send size={15} />
            ) : mode === 'schedule' ? (
              <CalendarClock size={15} />
            ) : (
              <FileText size={15} />
            )}
            {busy ? (mode === 'now' ? 'Publishing…' : 'Saving…') : primaryLabel}
          </button>

          {result && (
            <div className="mt-4 rounded-xl border border-border-soft bg-bg-soft p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                {result.status === 'posted' ? <Check size={15} className="text-success" /> : <AlertTriangle size={15} className="text-warning" />}
                <p className="text-sm font-semibold">
                  {result.status === 'posted'
                    ? 'Published everywhere'
                    : result.status === 'partial'
                      ? 'Published to some platforms'
                      : result.status === 'scheduled'
                        ? `Scheduled for ${formatWhen(result.scheduled_for)}`
                        : result.status === 'draft'
                          ? 'Saved as a draft'
                          : 'Nothing was published'}
                </p>
                {!initial && (
                  <button onClick={reset} className="ml-auto text-[11px] text-amber hover:underline">
                    Compose another
                  </button>
                )}
              </div>
              <ResultsList results={result.results} />
            </div>
          )}
        </Card>
      </div>

      {/* ---------------------------------------------------------- preview */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-6 space-y-3">
          <p className="text-xs font-semibold text-text-muted">Preview</p>
          {platforms.length === 0 ? (
            <p className="text-xs text-text-faint">Pick a platform to see how it will look.</p>
          ) : (
            platforms.map((p) => (
              <PreviewCard key={p} platform={p} text={textFor(p)} media={media} variant={variants[p]} postType={postType} name={authorName} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
