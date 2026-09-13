import { useMemo, useState } from 'react';
import { Users, Phone, FileText, DollarSign, Zap, Search, X, Check, type LucideIcon } from 'lucide-react';
import { useWarRoom } from '../../data/hooks/useWarRoom';
import { Card, SectionHeader, AccentButton, LoadingState, ErrorState, EmptyState } from '../../components/ui';
import type { FeedAlert } from '../../data/types';

const FEED_VISUAL: Record<string, { color: string; label: string }> = {
  lead: { color: '#4FC3F7', label: 'Lead' },
  alert: { color: '#EF6461', label: 'Alert' },
  traffic: { color: '#7C4DFF', label: 'Traffic' },
  client_health: { color: '#F5A623', label: 'Client' },
  milestone_due: { color: '#34D399', label: 'Milestone' },
  invoice_overdue: { color: '#EF6461', label: 'Invoice' },
};

function relativeTime(ts?: string | null): string {
  if (!ts) return '';
  const diffMs = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function FeedRow({ item }: { item: FeedAlert }) {
  const v = FEED_VISUAL[item.type] || FEED_VISUAL.lead;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-soft last:border-0">
      <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: v.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">{item.text}</p>
        <p className="text-xs text-text-faint mt-0.5">{relativeTime(item.timestamp)}</p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shrink-0" style={{ background: `${v.color}22`, color: v.color }}>
        {v.label}
      </span>
    </div>
  );
}

function FocusMode({ missions, onExit }: { missions: { text: string; priority: number }[]; onExit: () => void }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const remaining = missions.map((_, i) => i).filter((i) => !done.has(i));
  const currentIndex = remaining[0];
  const allDone = remaining.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center p-6">
      <button onClick={onExit} className="absolute top-6 right-6 text-text-muted hover:text-text">
        <X size={22} />
      </button>
      <div className="max-w-md w-full text-center">
        <p className="text-xs uppercase tracking-widest text-text-faint mb-6">Focus Mode</p>
        {allDone ? (
          <>
            <div className="h-14 w-14 rounded-full bg-success-bg text-success flex items-center justify-center mx-auto mb-5">
              <Check size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">All missions cleared</h2>
            <p className="text-sm text-text-muted mb-8">Refresh War Room for tomorrow's list.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-amber mb-3">
              {done.size + 1} of {missions.length}
            </p>
            <h2 className="text-2xl font-bold leading-snug mb-10">{missions[currentIndex].text}</h2>
          </>
        )}
        <AccentButton
          label={allDone ? 'Exit Focus Mode' : 'Mark Done & Next'}
          icon={allDone ? X : Check}
          onClick={() => (allDone ? onExit() : setDone((d) => new Set(d).add(currentIndex)))}
        />
      </div>
    </div>
  );
}

export function WarRoomPage() {
  const { missions, feed, summary, isLoading, isError, error, refetch } = useWarRoom();
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  const filteredFeed = useMemo(
    () => (query ? feed.filter((f) => f.text.toLowerCase().includes(query.toLowerCase())) : feed),
    [feed, query]
  );

  if (isLoading && !summary) return <LoadingState />;
  if (isError && !summary) return <ErrorState message={error?.message || 'Failed to load War Room'} onRetry={refetch} />;

  const pipeline = summary?.pipeline || {};
  const mrr = summary?.mrr || 0;
  const target = 2000;
  const progress = Math.min(1, mrr / target);
  const gapUnits = mrr >= target ? 0 : Math.ceil((target - mrr) / 85);

  return (
    <div className="space-y-8">
      {focusMode && <FocusMode missions={missions} onExit={() => setFocusMode(false)} />}

      <div>
        <h1 className="text-2xl font-bold">War Room</h1>
        <p className="text-sm text-text-muted mt-1">Everything that needs your attention, in one place.</p>
      </div>

      {/* MRR progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-text-faint uppercase tracking-wide">Monthly recurring revenue</p>
            <p className="font-mono-tab text-2xl font-bold mt-1">${mrr.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-amber">{(progress * 100).toFixed(0)}% to ${target.toLocaleString()}</p>
            <p className="text-xs text-text-faint mt-0.5">{gapUnits > 0 ? `${gapUnits} clients to go` : 'Target reached'}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-dark to-amber rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </Card>

      {/* Pipeline */}
      <div>
        <SectionHeader title="Pipeline" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {(
            [
              ['new', 'New', Users],
              ['contacted', 'Contacted', Users],
              ['call_booked', 'Calls', Phone],
              ['proposal_sent', 'Proposals', FileText],
              ['closed_won', 'Won', DollarSign],
              ['closed_lost', 'Lost', X],
            ] as [string, string, LucideIcon][]
          ).map(([key, label, Icon]) => (
            <Card key={key} className="p-3 text-center">
              <div className="mx-auto h-8 w-8 rounded-lg bg-amber/10 text-amber flex items-center justify-center mb-2">
                <Icon size={15} />
              </div>
              <p className="font-mono-tab text-lg font-bold">{pipeline[key] || 0}</p>
              <p className="text-[11px] text-text-faint">{label}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Missions */}
        <div className="lg:col-span-2">
          <SectionHeader title="Today's Missions" />
          {missions.length === 0 ? (
            <EmptyState text="No missions yet — refresh." />
          ) : (
            <div className="space-y-2">
              {missions.map((m) => (
                <Card key={m.priority} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber/12 text-amber flex items-center justify-center font-mono-tab font-bold text-sm shrink-0">
                    #{m.priority}
                  </div>
                  <p className="text-sm font-medium">{m.text}</p>
                </Card>
              ))}
              {missions.length > 0 && (
                <div className="pt-2">
                  <AccentButton label="Enter Focus Mode" icon={Zap} onClick={() => setFocusMode(true)} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live feed */}
        <div className="lg:col-span-3">
          <SectionHeader
            title="Live Feed"
            action={
              <div className="flex items-center gap-2 bg-surface border border-border-soft rounded-lg px-2.5 h-8">
                <Search size={13} className="text-text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search feed…"
                  className="bg-transparent outline-none text-xs w-32 placeholder:text-text-faint"
                />
              </div>
            }
          />
          <Card className="p-4">
            {filteredFeed.length === 0 ? (
              <EmptyState text={query ? `No matches for "${query}".` : 'No activity yet.'} />
            ) : (
              filteredFeed.slice(0, 15).map((item, i) => <FeedRow key={i} item={item} />)
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
