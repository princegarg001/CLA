import { useState } from 'react';
import { RadarIcon, RefreshCw, Sparkles, DollarSign, Flag, ExternalLink, Copy, Trophy } from 'lucide-react';
import { useContra, useGeneratePitch, useRegenerateProposal, useSolidGigs, useStartupsRip, useUpdateUpworkJob, useUpworkJobs, useUpworkStats } from '../../data/hooks/useFreelance';
import { Card, TabBar, IconButton, ScoreBadge, StatCard, Badge, AccentButton, LoadingState, EmptyState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { leadDisplayTitle, upworkBudgetLabel, type Lead, type UpworkJob } from '../../data/types';

function JobCard({ job, platform, dismissed, onDismiss }: { job: Lead; platform: string; dismissed: Set<string>; onDismiss: (id: string) => void }) {
  const generatePitch = useGeneratePitch();
  const [pitch, setPitch] = useState<string | null>(null);
  if (dismissed.has(job.id)) return null;

  const raw = (job.raw as Record<string, unknown>) || {};
  const budget = raw.budget as string | undefined;
  const tags = (raw.tags as string[]) || [];
  const applied = job.status !== 'new';

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">{(job.intent_signal as string) || leadDisplayTitle(job)}</p>
            <p className="text-xs text-text-faint mt-0.5">{(job.company as string) || 'Unknown company'}</p>
          </div>
          <ScoreBadge score={job.score} />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          {budget && (
            <span className="flex items-center gap-1 text-success font-semibold">
              <DollarSign size={13} /> {budget}
            </span>
          )}
          {job.region && (
            <span className="flex items-center gap-1 text-text-faint">
              <Flag size={12} /> {job.region as string}
            </span>
          )}
          {applied && <Badge tone="info">Applied</Badge>}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((t) => (
              <span key={t} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber/10 text-amber">
                {t}
              </span>
            ))}
          </div>
        )}
        {!applied && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                const r = await generatePitch.mutateAsync({ leadId: job.id, platform });
                setPitch(r.pitch);
              }}
              disabled={generatePitch.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-amber/15 text-amber disabled:opacity-50"
            >
              <Sparkles size={13} /> {generatePitch.isPending ? 'Generating…' : 'Generate Pitch'}
            </button>
            <button onClick={() => onDismiss(job.id)} className="rounded-lg px-3 py-2 text-xs font-medium border border-border-soft text-text-muted">
              Skip
            </button>
          </div>
        )}
      </Card>
      {pitch && (
        <Modal title="AI-generated pitch" onClose={() => setPitch(null)}>
          <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{pitch}</p>
        </Modal>
      )}
    </>
  );
}

function SolidGigsContraFeed({ jobs, platform, isLoading }: { jobs: Lead[]; platform: string; isLoading: boolean }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  if (isLoading && jobs.length === 0) return <LoadingState />;
  if (jobs.length === 0) return <EmptyState text="No jobs matched yet." />;
  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <JobCard key={j.id} job={j} platform={platform} dismissed={dismissed} onDismiss={(id) => setDismissed((d) => new Set(d).add(id))} />
      ))}
    </div>
  );
}

function StartupsRipFeed() {
  const { data, isLoading } = useStartupsRip();
  const items = data || [];
  return (
    <div className="space-y-3">
      <Card className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-critical-bg text-critical flex items-center justify-center">
          <RadarIcon size={16} />
        </div>
        <div>
          <p className="font-semibold text-sm">Startups.rip Intelligence</p>
          <p className="text-xs text-text-faint">{items.length} items in the latest digest</p>
        </div>
      </Card>
      {isLoading && items.length === 0 && <LoadingState />}
      {!isLoading && items.length === 0 && <EmptyState text="No digest items yet." />}
      {items.map((item, i) => (
        <Card key={i} className="p-4">
          <p className="font-semibold text-sm">{item.title}</p>
          {item.summary && <p className="text-xs text-text-faint mt-1 line-clamp-3">{item.summary}</p>}
        </Card>
      ))}
    </div>
  );
}

function UpworkJobCard({ job }: { job: UpworkJob }) {
  const [expanded, setExpanded] = useState(false);
  const updateJob = useUpdateUpworkJob();
  const regenerate = useRegenerateProposal();
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeValue, setOutcomeValue] = useState('');

  const history = job.client_history as { hireRate?: number; totalSpent?: number };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-sm">{job.title}</p>
          <p className="text-xs text-text-faint mt-0.5">{job.client_name || 'Unknown client'}</p>
        </div>
        <ScoreBadge score={Math.round(job.ai_score)} />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
        <span className="flex items-center gap-1 text-success font-semibold">
          <DollarSign size={13} /> {upworkBudgetLabel(job)}
        </span>
        {job.country && (
          <span className="flex items-center gap-1 text-text-faint">
            <Flag size={12} /> {job.country}
          </span>
        )}
        {job.status !== 'new' && <Badge tone="info">{job.status[0].toUpperCase() + job.status.slice(1)}</Badge>}
      </div>
      {(history?.hireRate != null || history?.totalSpent != null) && (
        <p className="text-[11px] text-text-faint mt-1.5">
          {[history.hireRate != null ? `${Math.round(history.hireRate * 100)}% hire rate` : null, history.totalSpent != null ? `$${Math.round(history.totalSpent)} spent` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.skills.map((s) => (
            <span key={s} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber/10 text-amber">
              {s}
            </span>
          ))}
        </div>
      )}
      {job.ai_score_reason && <p className="text-[11px] italic text-text-faint mt-2">{job.ai_score_reason}</p>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-amber/15 text-amber"
        >
          <Sparkles size={13} /> {expanded ? 'Hide Proposal' : 'View Proposal'}
        </button>
        {job.upwork_url && (
          <a href={job.upwork_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border border-border-soft">
            <ExternalLink size={13} /> Open
          </a>
        )}
      </div>

      {expanded && (
        <div className="mt-3">
          <div className="rounded-lg bg-bg-soft border border-border-soft p-3 text-xs text-text leading-relaxed">
            {job.ai_proposal || 'No proposal drafted yet — tap Regenerate.'}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => job.ai_proposal && navigator.clipboard.writeText(job.ai_proposal)}
              className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <Copy size={12} /> Copy
            </button>
            <button
              onClick={() => regenerate.mutate(job.id)}
              disabled={regenerate.isPending}
              className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={12} /> Regenerate
            </button>
          </div>
        </div>
      )}

      {['new', 'applied', 'interviewing'].includes(job.status) && (
        <div className="flex gap-2 mt-2">
          {job.status === 'new' && (
            <button onClick={() => updateJob.mutate({ id: job.id, status: 'applied' })} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium">
              Mark Applied
            </button>
          )}
          {job.status === 'applied' && (
            <button onClick={() => updateJob.mutate({ id: job.id, status: 'interviewing' })} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium">
              Interviewing
            </button>
          )}
          {job.status === 'interviewing' && (
            <button onClick={() => setOutcomeOpen(true)} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
              <Trophy size={12} /> Hired
            </button>
          )}
          {job.status !== 'new' && (
            <button onClick={() => updateJob.mutate({ id: job.id, status: 'rejected' })} className="flex-1 rounded-lg border border-critical/40 text-critical py-1.5 text-xs font-medium">
              Rejected
            </button>
          )}
        </div>
      )}

      {outcomeOpen && (
        <Modal title="Deal value" onClose={() => setOutcomeOpen(false)}>
          <input
            autoFocus
            value={outcomeValue}
            onChange={(e) => setOutcomeValue(e.target.value)}
            placeholder="e.g. 5000"
            type="number"
            className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber mb-4"
          />
          <AccentButton
            label="Save"
            onClick={() => {
              updateJob.mutate({ id: job.id, status: 'hired', outcomeValue: outcomeValue ? Number(outcomeValue) : undefined });
              setOutcomeOpen(false);
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

function UpworkTab() {
  const { data: jobs, isLoading } = useUpworkJobs();
  const { data: stats } = useUpworkStats();

  if (!jobs?.length && isLoading) return <LoadingState />;
  const sorted = [...(jobs || [])].sort((a, b) => b.ai_score - a.ai_score);

  return (
    <div className="space-y-4">
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Trophy} label="Win Rate" value={`${Math.round(stats.winRate * 100)}%`} />
            <StatCard icon={DollarSign} label="Avg Deal" value={`$${Math.round(stats.avgDealSize)}`} />
          </div>
          {stats.sample && <Badge tone="warning">Sample data — connect a webhook to see real numbers</Badge>}
        </>
      )}
      <p className="text-[15px] font-bold">Job Matches</p>
      {sorted.length === 0 ? (
        <EmptyState text="No jobs yet — connect a Vollna webhook or paste one manually." />
      ) : (
        <div className="space-y-3">
          {sorted.map((job) => (
            <UpworkJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FreelanceRadarPage() {
  const [tab, setTab] = useState(0);
  const solidgigs = useSolidGigs();
  const contra = useContra();

  const total = (solidgigs.data?.length || 0) + (contra.data?.length || 0);
  const applied = [...(solidgigs.data || []), ...(contra.data || [])].filter((l) => l.status !== 'new').length;
  const scores = [...(solidgigs.data || []), ...(contra.data || [])].map((l) => l.score);
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RadarIcon size={22} className="text-amber" /> Freelance Radar
          </h1>
          <p className="text-sm text-text-muted mt-1">Upwork, SolidGigs, Contra, and startup intel — all in one funnel.</p>
        </div>
        <IconButton
          icon={RefreshCw}
          onClick={() => {
            solidgigs.refetch();
            contra.refetch();
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ['New Jobs', total],
          ['Applied', applied],
          ['Insights', '—'],
          ['Avg Fit', avgScore],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className="font-mono-tab text-xl font-bold text-amber">{value}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={['Upwork', 'SolidGigs', 'Contra', 'Startups.rip']} active={tab} onChange={setTab} />

      {tab === 0 && <UpworkTab />}
      {tab === 1 && <SolidGigsContraFeed jobs={solidgigs.data || []} platform="solidgigs" isLoading={solidgigs.isLoading} />}
      {tab === 2 && <SolidGigsContraFeed jobs={contra.data || []} platform="contra" isLoading={contra.isLoading} />}
      {tab === 3 && <StartupsRipFeed />}
    </div>
  );
}
