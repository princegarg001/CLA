import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Heart, RefreshCw } from 'lucide-react';
import { useClients, useRescoreHealth } from '../../data/hooks/useClients';
import { Card, TabBar, IconButton, LoadingState, EmptyState } from '../../components/ui';
import type { Client } from '../../data/types';

function healthColor(score: number) {
  if (score >= 8) return 'text-success';
  if (score >= 6) return 'text-warning';
  return 'text-critical';
}
function healthDot(score: number) {
  if (score >= 8) return 'bg-success';
  if (score >= 6) return 'bg-warning';
  return 'bg-critical';
}

function ClientCard({ client }: { client: Client }) {
  const activeProject = client.projects?.find((p) => p.status === 'active');
  const progress = activeProject?.budget && activeProject.budget > 0 ? Math.min(1, client.total_revenue / activeProject.budget) : null;

  return (
    <Link to={`/clients/${client.id}`}>
      <Card className="p-4 hover:border-amber/40 transition-colors">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${healthDot(client.health_score)}`} />
          <p className="font-bold text-sm flex-1">{client.name}</p>
          <span className={`font-mono-tab text-xs font-bold ${healthColor(client.health_score)}`}>{client.health_score}/10</span>
        </div>
        {(client.company || client.region) && (
          <p className="text-xs text-text-faint mt-1">{[client.company, client.region].filter(Boolean).join(' · ')}</p>
        )}
        {activeProject && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-text-muted">{activeProject.title}</p>
            {progress != null && (
              <>
                <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden mt-2">
                  <div className="h-full bg-amber rounded-full" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-[11px] text-text-faint mt-1">
                  ${Math.round(client.total_revenue)} / ${Math.round(activeProject.budget || 0)}
                  {activeProject.due_date ? ` · Due ${new Date(activeProject.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}` : ''}
                </p>
              </>
            )}
          </div>
        )}
        {client.health_reason && client.health_score < 7 && (
          <p className={`text-[11px] mt-2 ${healthColor(client.health_score)}`}>⚠ {client.health_reason}</p>
        )}
      </Card>
    </Link>
  );
}

export function ClientVaultPage() {
  const [tab, setTab] = useState(0);
  const { data, isLoading, refetch } = useClients();
  const rescore = useRescoreHealth();

  const filtered = useMemo(() => {
    const clients = data || [];
    if (tab === 0) return clients.filter((c) => c.status === 'active');
    if (tab === 1) return clients.filter((c) => c.status === 'completed' || c.status === 'churned');
    return clients;
  }, [data, tab]);

  const activeCount = (data || []).filter((c) => c.status === 'active').length;
  const activeValue = (data || []).filter((c) => c.status === 'active').reduce((a, c) => a + c.total_revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase size={22} className="text-amber" /> Client Vault
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {activeCount} Active · ${Math.round(activeValue)} active value
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton icon={Heart} onClick={() => rescore.mutate()} />
          <IconButton icon={RefreshCw} onClick={() => refetch()} />
        </div>
      </div>

      <TabBar tabs={['Active', 'Completed', 'All']} active={tab} onChange={setTab} />

      {!data?.length && isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState text="No clients here yet." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}
