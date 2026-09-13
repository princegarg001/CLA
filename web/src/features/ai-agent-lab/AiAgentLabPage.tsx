import { Bot, UserSearch, PenLine, Microscope, Lightbulb, TrendingUp, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgentStatus, useAgentRuns, useVerdentInsights, useHeadaiSignals, useTriggerAgent } from '../../data/hooks/useAgents';
import { Card, SectionHeader, Badge, LoadingState, EmptyState } from '../../components/ui';

const AGENT_META: Record<string, { title: string; description: string; icon: LucideIcon; color: string; schedule: string }> = {
  prospector: {
    title: 'The Prospector',
    description: 'Monitors Apollo sequences, flags replies, scores new leads, triggers follow-ups.',
    icon: UserSearch,
    color: '#4FC3F7',
    schedule: '24/7',
  },
  publisher: {
    title: 'The Publisher',
    description: "Drafts next week's Twitter threads, pulls trending topics, generates post options.",
    icon: PenLine,
    color: '#00BFA5',
    schedule: 'Sundays',
  },
  researcher: {
    title: 'The Researcher',
    description: 'Researches new leads: funding, tech stack, news, job openings. Full brief before calls.',
    icon: Microscope,
    color: '#7C4DFF',
    schedule: 'On Trigger',
  },
};

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AiAgentLabPage() {
  const { data: status, isLoading } = useAgentStatus();
  const { data: runs } = useAgentRuns();
  const { data: verdent } = useVerdentInsights();
  const { data: headai } = useHeadaiSignals();
  const trigger = useTriggerAgent();

  if (isLoading && !status) return <LoadingState />;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot size={22} className="text-amber" /> AI Agent Lab
          </h1>
          <p className="text-sm text-text-muted mt-1">Three AI agents working autonomously. You check results, not tasks.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success px-3 py-1.5 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> {status?.running ?? 0} Running
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(AGENT_META).map(([name, meta]) => {
          const info = status?.agents.find((a) => a.name === name);
          const isRunning = info?.status === 'running';
          const isTriggering = trigger.isPending && trigger.variables === name;
          return (
            <Card key={name} className={`p-4 ${isRunning ? 'border-amber/40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}1F`, color: meta.color }}>
                  <meta.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{meta.title}</p>
                  <p className="text-xs text-text-faint">Schedule: {meta.schedule}</p>
                </div>
                <Badge tone={isRunning ? 'success' : 'muted'}>{isRunning ? 'Running' : 'Idle'}</Badge>
              </div>
              <p className="text-xs text-text-muted mt-2.5">{meta.description}</p>
              {info?.lastRun && <p className="text-[11px] text-text-faint mt-1.5">Last run: {relativeTime(info.lastRun)}</p>}
              <button
                onClick={() => trigger.mutate(name)}
                disabled={isTriggering}
                className="mt-3 w-full rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
                style={{ background: `${meta.color}1A`, color: meta.color }}
              >
                {isTriggering ? 'Running…' : 'Run Now'}
              </button>
            </Card>
          );
        })}
      </div>

      <div>
        <SectionHeader title="Verdent.ai Insights" />
        {!verdent?.length ? (
          <EmptyState text="No insights yet." />
        ) : (
          <div className="space-y-2">
            {verdent.map((v, i) => (
              <Card key={i} className="p-3.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-warning-bg text-warning flex items-center justify-center shrink-0">
                  <Lightbulb size={15} />
                </div>
                <p className="text-sm leading-relaxed">{v.text}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="HeadAI Signals" />
        {!headai?.length ? (
          <EmptyState text="No hiring signals yet." />
        ) : (
          <div className="space-y-2">
            {headai.map((h, i) => (
              <Card key={i} className="p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {h.company} — {h.hires} eng roles
                  </p>
                  <p className="text-xs text-text-faint truncate">{h.roles.length ? h.roles.join(', ') : h.region || ''}</p>
                </div>
                <Badge tone={h.hires >= 5 ? 'critical' : 'info'}>{h.hires >= 5 ? 'High Priority' : 'Add to Apollo'}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="Gro.app Automations" />
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Recent Flow Runs</p>
          {!runs?.length ? (
            <p className="text-xs text-text-faint">No Gro.app flow runs yet — trigger one via a webhook.</p>
          ) : (
            <div className="space-y-3">
              {runs.slice(0, 5).map((r) => {
                const ok = r.status === 'success';
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber/10 text-amber flex items-center justify-center shrink-0">
                      <GitBranch size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.started_at ? relativeTime(r.started_at) : r.id}</p>
                      <p className={`text-xs ${ok ? 'text-success' : 'text-critical'}`}>{ok ? 'Succeeded' : r.error || r.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
