import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, Plus, Repeat, Briefcase, Users2, HeartHandshake, ArrowDownRight } from 'lucide-react';
import { useAddDeal, useDeals, useMrr, useRevenueSummary, useRevenueTrend } from '../../data/hooks/useRevenue';
import { Card, SectionHeader, StatCard, AccentButton, LoadingState, EmptyState } from '../../components/ui';
import { Modal, ModalField, modalInputClass } from '../../components/Modal';

const SOURCE_COLOR: Record<string, string> = {
  apollo: '#4FC3F7',
  contra: '#00BFA5',
  solidgigs: '#7C4DFF',
  twitter: '#F5A623',
  gumroad: '#FF6B8A',
  direct: '#71828C',
};

function AddDealModal({ onClose }: { onClose: () => void }) {
  const addDeal = useAddDeal();
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');

  return (
    <Modal title="Add Deal" onClose={onClose}>
      <ModalField label="Client / project title">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={modalInputClass} />
      </ModalField>
      <ModalField label="Value (USD)">
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className={modalInputClass} />
      </ModalField>
      <ModalField label="Source (apollo, contra, direct...)">
        <input value={source} onChange={(e) => setSource(e.target.value)} className={modalInputClass} />
      </ModalField>
      <AccentButton
        label="Save"
        onClick={() => {
          if (!title.trim()) return;
          addDeal.mutate({ title: title.trim(), value: Number(value) || 0, source: source.trim() || undefined });
          onClose();
        }}
      />
    </Modal>
  );
}

export function RevenueCommandPage() {
  const { data: summary, isLoading } = useRevenueSummary();
  const { data: mrr } = useMrr();
  const { data: trend } = useRevenueTrend();
  const { data: deals } = useDeals();
  const [dealOpen, setDealOpen] = useState(false);

  if (isLoading && !summary) return <LoadingState />;

  const total = summary?.totalRevenue ?? 0;
  const bySource = summary?.revenueBySource || {};
  const sourceTotal = Object.values(bySource).reduce((a, b) => a + b, 0);
  const referrals = summary?.referrals;
  const chartData = (trend || []).map((t) => ({ week: `W${t.week + 1}`, mrr: t.mrr }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign size={22} className="text-amber" /> Revenue Command
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono-tab text-3xl font-extrabold text-text">${total.toLocaleString()}</p>
        </div>
        <button onClick={() => setDealOpen(true)} className="h-9 w-9 rounded-xl bg-amber/15 text-amber flex items-center justify-center shrink-0">
          <Plus size={18} />
        </button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="font-mono-tab text-sm font-bold">${(mrr?.mrr ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-text-faint mt-0.5">MRR</p>
          </div>
          <div>
            <p className="font-mono-tab text-sm font-bold">${(mrr?.arr ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-text-faint mt-0.5">ARR</p>
          </div>
          <div>
            <p className="font-mono-tab text-sm font-bold">{mrr?.churnRate != null ? `${(mrr.churnRate * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-[10px] text-text-faint mt-0.5">Churn</p>
          </div>
          <div>
            <p className="font-mono-tab text-sm font-bold">{mrr?.newMrr != null ? `+$${mrr.newMrr.toLocaleString()}` : '—'}</p>
            <p className="text-[10px] text-text-faint mt-0.5">New MRR</p>
          </div>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[15px] font-bold">MRR Trend</p>
            <p className="text-xs text-text-faint">{chartData.length} weeks</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`$${v}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="var(--color-amber)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Repeat} label="SaaS MRR" value={`$${(summary?.mrr ?? 0).toLocaleString()}`} />
        <StatCard icon={Briefcase} label="Project Revenue" value={`$${(summary?.projectRevenue ?? 0).toLocaleString()}`} />
      </div>

      {sourceTotal > 0 && (
        <div>
          <SectionHeader title="Revenue by Source" />
          <Card className="p-5 space-y-3.5">
            {Object.entries(bySource).map(([source, value]) => {
              const pct = sourceTotal === 0 ? 0 : value / sourceTotal;
              const color = SOURCE_COLOR[source] || '#71828C';
              return (
                <div key={source}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                    <span className="text-sm flex-1">{source[0].toUpperCase() + source.slice(1)}</span>
                    <span className="text-sm font-semibold">${value.toLocaleString()}</span>
                    <span className="text-xs text-text-faint w-10 text-right">{(pct * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {referrals && referrals.leadCount > 0 && (
        <div>
          <SectionHeader title="Referrals" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users2} label="Referred Leads" value={`${referrals.leadCount}`} />
            <StatCard icon={HeartHandshake} label="Referral Revenue" value={`$${referrals.revenue.toLocaleString()}`} />
          </div>
        </div>
      )}

      {mrr && (
        <div>
          <SectionHeader title="MRR Health" />
          <Card className="p-5 grid grid-cols-3 text-center gap-2">
            <div>
              <p className="font-mono-tab text-base font-bold text-success">{mrr.expansionMrr != null ? `+$${mrr.expansionMrr.toLocaleString()}` : '—'}</p>
              <p className="text-[11px] text-text-faint mt-0.5">Expansion MRR</p>
            </div>
            <div>
              <p className="font-mono-tab text-base font-bold text-amber">{mrr.netRevenueRetention != null ? `${(mrr.netRevenueRetention * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-[11px] text-text-faint mt-0.5">Net Retention</p>
            </div>
            <div>
              <p className="font-mono-tab text-base font-bold text-critical">{mrr.churnRate != null ? `${(mrr.churnRate * 100).toFixed(1)}%` : '—'}</p>
              <p className="text-[11px] text-text-faint mt-0.5">Churn Rate</p>
            </div>
          </Card>
        </div>
      )}

      <div>
        <SectionHeader title="Recent Deals" action={<button onClick={() => setDealOpen(true)} className="text-xs font-semibold text-amber">Add Deal</button>} />
        {!deals?.length ? (
          <EmptyState text="No deals recorded yet." />
        ) : (
          <div className="space-y-2">
            {deals.map((d) => (
              <Card key={d.id} className="p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0">
                  <ArrowDownRight size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.title}</p>
                  <p className="text-xs text-text-faint">
                    {d.closed_at ? new Date(d.closed_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ''}
                    {d.source ? ` • via ${d.source}` : ''}
                  </p>
                </div>
                <p className="font-mono-tab text-sm font-bold text-success">+${d.value.toLocaleString()}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {dealOpen && <AddDealModal onClose={() => setDealOpen(false)} />}
    </div>
  );
}
