import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Send, Copy, Trash2, Pencil, RotateCw, Check, Undo2, Loader2, List, CalendarDays, AlertTriangle } from 'lucide-react';
import { Card, Badge, LoadingState, EmptyState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { Composer } from './Composer';
import { ResultsList, PLATFORM_META } from './ResultsList';
import {
  useApproveCalendarEntry,
  useCalendarEntries,
  useDeleteEntry,
  useDuplicateEntry,
  useFillWeek,
  usePublishCalendarEntryNow,
  useUpdateEntry,
} from '../../data/hooks/useCalendar';
import { formatWhen } from '../../core/timeSlots';
import type { CalendarEntry, CalendarStatus } from '../../data/types';

const STATUS_TONE: Record<CalendarStatus, 'warning' | 'info' | 'success' | 'critical' | 'muted'> = {
  draft: 'warning',
  scheduled: 'info',
  publishing: 'info',
  posted: 'success',
  partial: 'warning',
  failed: 'critical',
  cancelled: 'muted',
};

const STATUS_DOT: Record<CalendarStatus, string> = {
  draft: 'bg-warning',
  scheduled: 'bg-info',
  publishing: 'bg-info',
  posted: 'bg-success',
  partial: 'bg-warning',
  failed: 'bg-critical',
  cancelled: 'bg-text-faint',
};

type Filter = 'all' | 'draft' | 'scheduled' | 'posted' | 'attention';

function preview(e: CalendarEntry): string {
  const v = e.raw?.variants;
  const first = e.platforms.map((p) => v?.[p]?.title || v?.[p]?.text).find(Boolean);
  return (e.content || first || '(media only)').trim();
}

function EntryCard({ entry, onEdit }: { entry: CalendarEntry; onEdit: (e: CalendarEntry) => void }) {
  const approve = useApproveCalendarEntry();
  const publish = usePublishCalendarEntryNow();
  const duplicate = useDuplicateEntry();
  const remove = useDeleteEntry();
  const update = useUpdateEntry();
  const [error, setError] = useState<string | null>(null);

  const busy = approve.isPending || publish.isPending || duplicate.isPending || remove.isPending || update.isPending || entry.status === 'publishing';
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const attempts = entry.raw?.attempts || 0;
  const retryAt = entry.raw?.next_attempt_at;
  const s = entry.status;
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-2.5 py-1.5 text-[11px] font-medium hover:border-amber hover:text-amber disabled:opacity-40';

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1.5">
          {entry.platforms.map((p) => (
            <span key={p} className="h-2 w-2 rounded-full" style={{ background: PLATFORM_META[p]?.color || '#71828C' }} title={PLATFORM_META[p]?.label || p} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-xs text-text-faint">{formatWhen(entry.scheduled_for)}</p>
            {entry.post_type === 'thread' && <Badge tone="muted">thread</Badge>}
            {(entry.raw?.media?.length || entry.media_urls?.length) ? <Badge tone="muted">{entry.raw?.media?.length || entry.media_urls.length} media</Badge> : null}
            {entry.ai_generated && <Sparkles size={12} className="text-amber" />}
            <div className="ml-auto">
              <Badge tone={STATUS_TONE[s]}>{s === 'publishing' ? 'publishing…' : s}</Badge>
            </div>
          </div>
          <p className="text-sm line-clamp-3 whitespace-pre-wrap">{preview(entry)}</p>

          {s === 'scheduled' && retryAt && attempts > 0 && (
            <p className="text-[11px] text-warning mt-2 flex items-center gap-1.5">
              <RotateCw size={11} /> Attempt {attempts} hit a temporary error — retrying at {formatWhen(retryAt)}
            </p>
          )}
          {entry.results.length > 0 && (
            <div className="mt-2.5">
              <ResultsList results={entry.results} />
            </div>
          )}
          {error && <p className="text-[11px] text-critical mt-2">{error}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            {s === 'publishing' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-faint">
                <Loader2 size={12} className="animate-spin" /> Sending…
              </span>
            )}
            {(s === 'draft' || s === 'scheduled' || s === 'failed' || s === 'partial') && (
              <button className={btn} disabled={busy} onClick={() => onEdit(entry)}>
                <Pencil size={12} /> Edit
              </button>
            )}
            {s === 'draft' && (
              <button className={btn} disabled={busy} onClick={() => run(() => approve.mutateAsync(entry.id))}>
                <Check size={12} /> Approve & schedule
              </button>
            )}
            {s === 'scheduled' && (
              <button className={btn} disabled={busy} onClick={() => run(() => update.mutateAsync({ id: entry.id, status: 'draft' }))}>
                <Undo2 size={12} /> Unschedule
              </button>
            )}
            {(s === 'draft' || s === 'scheduled') && (
              <button className={btn} disabled={busy} onClick={() => window.confirm('Publish this right now?') && run(() => publish.mutateAsync(entry.id))}>
                <Send size={12} /> Publish now
              </button>
            )}
            {(s === 'failed' || s === 'partial') && (
              <button className={btn} disabled={busy} onClick={() => run(() => publish.mutateAsync(entry.id))}>
                <RotateCw size={12} /> {s === 'partial' ? 'Retry failed platforms' : 'Retry'}
              </button>
            )}
            {s !== 'publishing' && (
              <button className={btn} disabled={busy} onClick={() => run(() => duplicate.mutateAsync(entry.id))}>
                <Copy size={12} /> Duplicate
              </button>
            )}
            {s !== 'publishing' && (
              <button
                className={`${btn} hover:!border-critical hover:!text-critical`}
                disabled={busy}
                onClick={() =>
                  window.confirm(s === 'posted' ? 'Remove from the calendar? The live posts stay up on each platform.' : 'Delete this post?') &&
                  run(() => remove.mutateAsync({ id: entry.id, permanent: true }))
                }
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MonthGrid({
  entries,
  cursor,
  onEdit,
  onCompose,
}: {
  entries: CalendarEntry[];
  cursor: Date;
  onEdit: (e: CalendarEntry) => void;
  onCompose: (d: Date) => void;
}) {
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      const d = new Date(e.scheduled_for);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, [...(map.get(key) || []), e]);
    }
    return map;
  }, [entries]);

  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 text-[10px] uppercase tracking-wide text-text-faint mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-2 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border-soft rounded-xl overflow-hidden">
          {days.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const list = byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) || [];
            const past = d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            return (
              <div
                key={d.toISOString()}
                onClick={() => {
                  if (past) return;
                  const at = new Date(d);
                  at.setHours(9, 0, 0, 0);
                  onCompose(at);
                }}
                className={`min-h-[92px] border-r border-b border-border-soft p-1.5 ${inMonth ? 'bg-surface' : 'bg-bg-soft/60'} ${past ? '' : 'cursor-pointer hover:bg-surface-raised/40'}`}
              >
                <p className={`text-[11px] mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 ${isToday(d) ? 'bg-amber text-[#221604] font-bold' : inMonth ? 'text-text-muted' : 'text-text-faint'}`}>
                  {d.getDate()}
                </p>
                <div className="space-y-1">
                  {list.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEdit(e);
                      }}
                      className="w-full flex items-center gap-1.5 rounded-md bg-bg-soft border border-border-soft px-1.5 py-1 text-left hover:border-amber"
                      title={preview(e)}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[e.status]}`} />
                      <span className="text-[10px] truncate">{preview(e)}</span>
                    </button>
                  ))}
                  {list.length > 3 && <p className="text-[10px] text-text-faint px-1">+{list.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ onCompose }: { onCompose: (date?: Date) => void }) {
  const { data: entries, isLoading } = useCalendarEntries();
  const fillWeek = useFillWeek();
  const [view, setView] = useState<'month' | 'list'>('list');
  const [cursor, setCursor] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<CalendarEntry | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const all = entries || [];
  const attention = all.filter((e) => e.status === 'failed' || e.status === 'partial').length;

  const shown = useMemo(() => {
    const f = all.filter((e) => {
      if (filter === 'all') return true;
      if (filter === 'attention') return e.status === 'failed' || e.status === 'partial';
      if (filter === 'scheduled') return e.status === 'scheduled' || e.status === 'publishing';
      return e.status === filter;
    });
    // Upcoming first (soonest at the top), then history (newest first).
    const now = Date.now();
    const upcoming = f.filter((e) => new Date(e.scheduled_for).getTime() >= now || e.status === 'draft' || e.status === 'scheduled');
    const rest = f.filter((e) => !upcoming.includes(e));
    upcoming.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    rest.sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime());
    return [...upcoming, ...rest];
  }, [all, filter]);

  async function fill() {
    setNote(null);
    try {
      const r = await fillWeek.mutateAsync();
      setNote(r.created > 0 ? `Drafted ${r.created} posts for the week — review and approve them below.` : 'The AI is unavailable right now, so nothing was drafted.');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  const filters: [Filter, string][] = [
    ['all', 'All'],
    ['draft', 'Drafts'],
    ['scheduled', 'Scheduled'],
    ['posted', 'Posted'],
    ['attention', `Needs attention${attention ? ` (${attention})` : ''}`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border-soft overflow-hidden text-xs font-medium">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${view === 'list' ? 'bg-amber/15 text-amber' : 'text-text-muted'}`}>
            <List size={13} /> List
          </button>
          <button onClick={() => setView('month')} className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${view === 'month' ? 'bg-amber/15 text-amber' : 'text-text-muted'}`}>
            <CalendarDays size={13} /> Month
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                filter === k ? 'border-amber bg-amber/12 text-amber' : k === 'attention' && attention ? 'border-critical/50 text-critical' : 'border-border-soft text-text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={fill}
          disabled={fillWeek.isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber/15 text-amber px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <Sparkles size={13} /> {fillWeek.isPending ? 'Planning…' : 'Fill week with AI'}
        </button>
      </div>

      {note && <p className="text-xs text-text-muted flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber" /> {note}</p>}

      {!entries?.length && isLoading ? (
        <LoadingState />
      ) : view === 'month' ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="h-8 w-8 rounded-lg border border-border-soft flex items-center justify-center hover:border-amber">
              <ChevronLeft size={15} />
            </button>
            <p className="text-sm font-bold w-40 text-center">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="h-8 w-8 rounded-lg border border-border-soft flex items-center justify-center hover:border-amber">
              <ChevronRight size={15} />
            </button>
            <button onClick={() => setCursor(new Date())} className="text-xs text-amber hover:underline ml-1">
              Today
            </button>
            <p className="ml-auto text-[11px] text-text-faint hidden sm:block">Click any future day to compose for it</p>
          </div>
          <MonthGrid entries={shown} cursor={cursor} onEdit={setEditing} onCompose={onCompose} />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState text={filter === 'all' ? 'Nothing planned yet — compose a post or let the AI fill your week.' : 'Nothing here.'} />
      ) : (
        <div className="space-y-3">
          {shown.map((e) => (
            <EntryCard key={e.id} entry={e} onEdit={setEditing} />
          ))}
        </div>
      )}

      {editing && (
        <Modal title="Edit post" size="xl" onClose={() => setEditing(null)}>
          <Composer initial={editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
