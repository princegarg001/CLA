import { useEffect, useMemo, useState } from 'react';
import { Rocket, RefreshCw, Send, Lock, Unlock, PlusCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useApolloSearch, useApolloSequences, useIcpProfiles, useImportLead, usePipelineLeads, useSaveIcp } from '../../data/hooks/useApollo';
import { useUpdateLead } from '../../data/hooks/useLeads';
import { Card, TabBar, IconButton, InitialsAvatar, ScoreBadge, SearchInput, AccentButton, LoadingState, EmptyState } from '../../components/ui';
import { leadDisplayName, leadDisplayTitle, type Lead } from '../../data/types';

function useDebounced<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function LeadCard({ lead, inPipeline }: { lead: Lead; inPipeline: boolean }) {
  const importLead = useImportLead();
  const updateLead = useUpdateLead();

  return (
    <Card className={`p-4 ${lead.locked ? 'border-warning/40' : ''}`}>
      <div className="flex items-start gap-3">
        <InitialsAvatar name={leadDisplayName(lead)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{leadDisplayName(lead)}</p>
            {inPipeline && (
              <button
                onClick={() => updateLead.mutate({ id: lead.id, patch: { locked: !lead.locked } })}
                className={`p-1 rounded-md ${lead.locked ? 'bg-warning/15 text-warning' : 'bg-surface-hover text-text-faint'}`}
                title={lead.locked ? 'Locked — won\'t resurface' : 'Lock this lead'}
              >
                {lead.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            )}
            <ScoreBadge score={lead.score} />
          </div>
          <p className="text-xs text-text-muted mt-0.5">{leadDisplayTitle(lead)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
        {lead.region && <span className="px-2 py-1 rounded-md bg-surface-hover text-text-muted">{lead.region}</span>}
        {lead.tech_stack && lead.tech_stack.length > 0 && (
          <span className="text-text-faint truncate">{lead.tech_stack.join(', ')}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {!inPipeline ? (
          <button
            onClick={() => importLead.mutate(lead)}
            disabled={importLead.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-success-bg text-success hover:brightness-110 disabled:opacity-50"
          >
            <PlusCircle size={13} /> {importLead.isPending ? 'Adding…' : 'Add to Pipeline'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-success-bg text-success">
            <CheckCircle2 size={13} /> In Pipeline
          </span>
        )}
        {lead.linkedin_url && (
          <a
            href={lead.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: '#0077B51A', color: '#0077B5' }}
          >
            <ExternalLink size={13} /> LinkedIn
          </a>
        )}
      </div>
    </Card>
  );
}

function SequencesTab() {
  const { data, isLoading } = useApolloSequences();
  if (isLoading) return <LoadingState />;
  const sequences = data || [];
  if (sequences.length === 0) return <EmptyState text="No sequences yet." />;
  return (
    <div className="space-y-3">
      {sequences.map((s) => (
        <Card key={s.id} className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg bg-amber/12 text-amber flex items-center justify-center">
              <Send size={16} />
            </div>
            <p className="font-semibold text-sm">{s.name}</p>
          </div>
          <div className="flex gap-6 font-mono-tab">
            <div>
              <p className="text-base font-bold text-info">{s.open_rate != null ? `${(s.open_rate * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-[11px] text-text-faint">Open Rate</p>
            </div>
            <div>
              <p className="text-base font-bold text-success">{s.reply_rate != null ? `${(s.reply_rate * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-[11px] text-text-faint">Reply Rate</p>
            </div>
            <div>
              <p className="text-base font-bold text-amber">{s.booked_calls}</p>
              <p className="text-[11px] text-text-faint">Booked Calls</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function IcpBuilderTab() {
  const { data: profiles } = useIcpProfiles();
  const saveIcp = useSaveIcp();
  const [form, setForm] = useState({
    name: 'Fintech CTOs — US/UK/EU',
    industries: 'Fintech, SaaS, HealthTech',
    regions: 'US, UK, EU',
    techStack: 'Python, Node.js, AWS, Microservices',
  });

  const split = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-bold text-base mb-1">Ideal Client Profile</h3>
        <p className="text-xs text-text-faint mb-4">Define who you're targeting. Apollo will remember it.</p>
        <div className="space-y-3">
          {[
            ['Profile name', 'name'],
            ['Industry', 'industries'],
            ['Region', 'regions'],
            ['Tech Stack', 'techStack'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs font-semibold text-text-muted block mb-1.5">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <AccentButton
            label="Save ICP & Search"
            icon={Rocket}
            loading={saveIcp.isPending}
            onClick={() =>
              saveIcp.mutate({
                name: form.name || 'Untitled ICP',
                industries: split(form.industries),
                regions: split(form.regions),
                tech_stack: split(form.techStack),
              })
            }
          />
        </div>
      </Card>
      {profiles && profiles.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-2">Saved ICPs</h3>
          <div className="space-y-1.5">
            {profiles.map((icp) => (
              <p key={icp.id} className="text-sm text-text-muted">• {icp.name}</p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function ApolloHunterPage() {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const titles = useMemo(() => (debounced.trim() ? debounced.trim().split(/\s+/) : undefined), [debounced]);
  const search = useApolloSearch(titles);
  const pipeline = usePipelineLeads();
  const sequences = useApolloSequences();
  const icp = useIcpProfiles();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket size={22} className="text-amber" /> Apollo Hunter
          </h1>
          <p className="text-sm text-text-muted mt-1">Search 230M+ contacts, import the strongest matches.</p>
        </div>
        <IconButton
          icon={RefreshCw}
          onClick={() => {
            search.refetch();
            pipeline.refetch();
            sequences.refetch();
            icp.refetch();
          }}
        />
      </div>

      <SearchInput placeholder="Search 230M+ contacts by title…" onChange={setQuery} />

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Found', (search.data || []).length],
          ['In Pipeline', (pipeline.data || []).length],
          ['Sequences', (sequences.data || []).length],
          ['ICPs Saved', (icp.data || []).length],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className="font-mono-tab text-xl font-bold text-amber">{value}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={['Leads', 'Sequences', 'ICP Builder']} active={tab} onChange={setTab} />

      {tab === 0 && <LeadsTabBody query={debounced} />}
      {tab === 1 && <SequencesTab />}
      {tab === 2 && <IcpBuilderTab />}
    </div>
  );
}

// Shares the header search box above as its single source of truth, so the
// quick-stats row and the Leads tab's results never drift out of sync.
function LeadsTabBody({ query }: { query: string }) {
  const titles = useMemo(() => (query.trim() ? query.trim().split(/\s+/) : undefined), [query]);
  const search = useApolloSearch(titles);
  const pipeline = usePipelineLeads();

  const results = search.data || [];
  const pipelineLeads = pipeline.data || [];

  if ((search.isLoading || pipeline.isLoading) && results.length === 0 && pipelineLeads.length === 0) return <LoadingState />;

  const items = [...results, ...pipelineLeads];
  if (items.length === 0) return <EmptyState text="No leads yet — try a search above." />;

  return (
    <div className="space-y-3">
      {items.map((lead, i) => (
        <LeadCard key={lead.id || i} lead={lead} inPipeline={i >= results.length} />
      ))}
    </div>
  );
}
