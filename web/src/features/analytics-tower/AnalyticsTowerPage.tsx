import { useState } from 'react';
import { BarChart3, Eye, Users2, Link2, Bug, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { useActiveVisitors, useSentryHealth, useUmamiStats, useWeeklyReport } from '../../data/hooks/useAnalytics';
import { Card, TabBar, SectionHeader, StatCard, Badge, LoadingState, EmptyState } from '../../components/ui';

function HealthCard({ label, value, tone, icon: Icon }: { label: string; value: number; tone: 'critical' | 'warning' | 'success' | 'info'; icon: typeof Bug }) {
  const colorMap = { critical: 'text-critical bg-critical-bg', warning: 'text-warning bg-warning-bg', success: 'text-success bg-success-bg', info: 'text-info bg-info-bg' };
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className={`font-mono-tab text-xl font-bold ${colorMap[tone].split(' ')[0]}`}>{value}</p>
        <p className="text-[11px] text-text-faint">{label}</p>
      </div>
    </Card>
  );
}

function UmamiTab() {
  const { data: umami, isLoading } = useUmamiStats();
  if (isLoading && !umami) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Eye} label="Pageviews" value={`${umami?.pageviews ?? 0}`} />
        <StatCard icon={Users2} label="Visitors" value={`${umami?.visitors ?? 0}`} />
      </div>
      <div>
        <SectionHeader title="Traffic Sources" />
        {!umami?.topSources.length ? (
          <EmptyState text="No source data yet." />
        ) : (
          <div className="space-y-2">
            {umami.topSources.map((s, i) => (
              <Card key={i} className="p-3.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber/12 text-amber flex items-center justify-center">
                  <Link2 size={15} />
                </div>
                <p className="text-sm font-semibold flex-1">{String(s.name || 'Unknown')}</p>
                <p className="font-mono-tab text-sm font-bold text-amber">{String(s.pct ?? 0)}%</p>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionHeader title="Visitor Geography" />
        {!umami || Object.keys(umami.geography).length === 0 ? (
          <EmptyState text="No geography data yet." />
        ) : (
          <Card className="p-4 divide-y divide-border-soft">
            {Object.entries(umami.geography).map(([country, count]) => (
              <div key={country} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm">{country}</span>
                <span className="text-sm font-semibold">
                  {count} ({umami.visitors ? Math.round((count / umami.visitors) * 100) : 0}%)
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
      <div>
        <SectionHeader title="Top Pages" />
        {!umami?.topPages.length ? (
          <EmptyState text="No page data yet." />
        ) : (
          <Card className="p-4 divide-y divide-border-soft">
            {umami.topPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm">{String(p.path || '/')}</span>
                <span className="text-sm font-semibold text-text-muted">{String(p.views ?? 0)} views</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function SentryTab() {
  const { data: sentry, isLoading } = useSentryHealth();
  if (isLoading && !sentry) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <HealthCard label="Critical" value={sentry?.critical ?? 0} tone={(sentry?.critical ?? 0) > 0 ? 'critical' : 'success'} icon={ShieldAlert} />
        <HealthCard label="Warnings" value={sentry?.warnings ?? 0} tone="warning" icon={AlertTriangle} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HealthCard label="Errors Today" value={sentry?.errorsToday ?? 0} tone="critical" icon={Bug} />
        <HealthCard label="Resolved" value={sentry?.resolved ?? 0} tone="success" icon={CheckCircle2} />
      </div>
      <div>
        <SectionHeader title="Active Issues" />
        {!sentry?.recent.length ? (
          <EmptyState text="No issues detected." />
        ) : (
          <div className="space-y-2">
            {sentry.recent.map((issue, i) => {
              const level = String(issue.level || 'info');
              const tone = level === 'error' || level === 'fatal' ? 'critical' : level === 'warning' ? 'warning' : 'info';
              return (
                <Card key={i} className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone === 'critical' ? 'bg-critical' : tone === 'warning' ? 'bg-warning' : 'bg-info'}`} />
                    <p className="text-sm font-semibold flex-1">{String(issue.title || '')}</p>
                    <Badge tone={tone}>{level[0].toUpperCase() + level.slice(1)}</Badge>
                  </div>
                  {issue.time != null && <p className="text-[11px] text-text-faint mt-1.5">{String(issue.time)}</p>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CombinedTab() {
  const { data: sentry } = useSentryHealth();
  const { data: activeVisitors } = useActiveVisitors();
  const { data: report } = useWeeklyReport();
  const visitors = activeVisitors?.visitors ?? 0;
  const hasCritical = (sentry?.critical ?? 0) > 0;
  const highTraffic = visitors >= 20;

  return (
    <div className="space-y-4">
      {hasCritical && (
        <Card className="p-4 border-critical/30 bg-critical-bg/40 flex items-start gap-3">
          <AlertTriangle size={20} className="text-critical shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-critical">Critical site errors detected</p>
            <p className="text-xs text-text mt-1">{sentry!.critical} critical issue(s) affecting the site right now — check Sentry before anything else.</p>
          </div>
        </Card>
      )}
      {highTraffic && (
        <Card className="p-4 border-warning/30 bg-warning-bg/40 flex items-start gap-3">
          <Info size={20} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">Traffic spike</p>
            <p className="text-xs text-text mt-1">{visitors} live visitors right now — a good moment to check the contact form is working.</p>
          </div>
        </Card>
      )}
      {!hasCritical && !highTraffic && (
        <Card className="p-4 flex items-center gap-3">
          <ShieldCheck size={20} className="text-success" />
          <p className="text-sm">No active alerts — traffic and error rates are normal.</p>
        </Card>
      )}
      <div>
        <SectionHeader title="Weekly Report" />
        <Card className="p-5">
          <p className="text-[15px] font-bold mb-3">Performance Summary</p>
          <div className="space-y-2">
            {[
              ['New Leads', report?.newLeads ?? 0],
              ['Calls Booked', report?.callsBooked ?? 0],
              ['Deals Closed', report?.dealsClosed ?? 0],
              ['Revenue Closed', `$${(report?.revenueClosed ?? 0).toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{label as string}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          {report?.insight && <div className="mt-3 rounded-lg bg-info-bg text-info text-xs font-medium p-3 leading-relaxed">{report.insight}</div>}
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsTowerPage() {
  const [tab, setTab] = useState(0);
  const { data: umami } = useUmamiStats();
  const { data: sentry } = useSentryHealth();
  const { data: activeVisitors } = useActiveVisitors();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={22} className="text-amber" /> Analytics Tower
          </h1>
          <p className="text-sm text-text-muted mt-1">Umami traffic and Sentry errors, cross-referenced for real alerts.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1.5 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> {activeVisitors?.visitors ?? 0} live
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Pageviews', umami?.pageviews ?? 0],
          ['Visitors', umami?.visitors ?? 0],
          ['Errors', sentry?.errorsToday ?? 0],
          ['Critical', sentry?.critical ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className="font-mono-tab text-xl font-bold text-amber">{value as number}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={['Umami', 'Sentry', 'Combined']} active={tab} onChange={setTab} />

      {tab === 0 && <UmamiTab />}
      {tab === 1 && <SentryTab />}
      {tab === 2 && <CombinedTab />}
    </div>
  );
}
