import { useState } from 'react';
import { MessageSquare, RefreshCw, AtSign, Briefcase, Send as SendIcon, Mail, MessageCircle, FileText, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useInbox, useTemplates, useGenerateDraft, useSendMessage } from '../../data/hooks/useOutreach';
import { useLeads } from '../../data/hooks/useLeads';
import { Card, TabBar, IconButton, LoadingState, EmptyState, Badge } from '../../components/ui';
import { leadDisplayName, type OutreachMessage } from '../../data/types';

const CHANNEL_VISUAL: Record<string, { icon: LucideIcon; color: string }> = {
  twitter_dm: { icon: AtSign, color: '#1DA1F2' },
  contra: { icon: Briefcase, color: '#00BFA5' },
  solidgigs: { icon: SendIcon, color: '#7C4DFF' },
  contact_form: { icon: Mail, color: '#F5A623' },
  whatsapp: { icon: MessageCircle, color: '#34D399' },
};

function channelLabel(channel: string) {
  return channel
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MessageCard({ m }: { m: OutreachMessage }) {
  const visual = CHANNEL_VISUAL[m.channel] || { icon: Mail, color: '#4FC3F7' };
  const tone = m.status === 'replied' ? 'success' : m.status === 'sent' ? 'info' : 'muted';
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${visual.color}1F`, color: visual.color }}>
        <visual.icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${visual.color}1A`, color: visual.color }}>
            {channelLabel(m.channel)}
          </span>
          <div className="flex-1" />
          {m.created_at && <span className="text-xs text-text-faint">{relativeTime(m.created_at)}</span>}
        </div>
        <p className="text-xs text-text-faint mt-1 line-clamp-2">{m.body}</p>
      </div>
      <Badge tone={tone}>{m.status[0].toUpperCase() + m.status.slice(1)}</Badge>
    </Card>
  );
}

function InboxTab() {
  const { data: inbox, isLoading } = useInbox();
  if (!inbox?.length && isLoading) return <LoadingState />;
  if (!inbox?.length) return <EmptyState text="No messages yet — compose one to get started." />;
  return (
    <div className="space-y-2.5">
      {inbox.map((m) => (
        <MessageCard key={m.id} m={m} />
      ))}
    </div>
  );
}

function TemplatesTab() {
  const { data: templates } = useTemplates();
  if (!templates?.length) return <EmptyState text="No templates saved yet." />;
  return (
    <div className="space-y-2.5">
      {templates.map((t) => (
        <Card key={t.id} className="p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber/12 text-amber flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm">{t.name}</p>
            <p className="text-xs text-text-faint">
              {t.market || 'All markets'} • {t.tone || 'Any tone'}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

const TONES: [string, string][] = [
  ['Technical', 'technical'],
  ['Casual', 'casual'],
  ['Formal', 'formal'],
  ['Founder-to-founder', 'founder_to_founder'],
];
const CHANNELS: [string, string][] = [
  ['Apollo Email', 'apollo_email'],
  ['Twitter DM', 'twitter_dm'],
  ['Contra', 'contra'],
  ['SolidGigs', 'solidgigs'],
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
        selected ? 'border-amber bg-amber/12 text-amber font-semibold' : 'border-border-soft text-text-muted'
      }`}
    >
      {label}
    </button>
  );
}

function ComposeTab() {
  const { data: leads } = useLeads();
  const generateDraft = useGenerateDraft();
  const sendMessage = useSendMessage();
  const [leadId, setLeadId] = useState('');
  const [channel, setChannel] = useState('apollo_email');
  const [tone, setTone] = useState('founder_to_founder');
  const [market, setMarket] = useState('US');
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function generate() {
    if (!leadId) {
      setNotice('Pick a lead first');
      return;
    }
    try {
      const draft = await generateDraft.mutateAsync({ leadId, tone, market, channel });
      setBody(draft.body);
      setDraftId(draft.id);
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not generate a draft');
    }
  }

  async function send() {
    if (!draftId) {
      setNotice('Generate a draft first');
      return;
    }
    try {
      await sendMessage.mutateAsync({ id: draftId, body });
      setNotice('Sent');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Failed to send');
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <p className="text-[15px] font-bold">New Message</p>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">To</label>
        <select
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 text-sm outline-none focus:border-amber"
        >
          <option value="">Select a lead…</option>
          {(leads || []).map((l) => (
            <option key={l.id} value={l.id}>
              {leadDisplayName(l)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">Channel</label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(([label, value]) => (
            <Chip key={value} label={label} selected={channel === value} onClick={() => setChannel(value)} />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map(([label, value]) => (
            <Chip key={value} label={label} selected={tone === value} onClick={() => setTone(value)} />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">Target Market</label>
        <div className="flex gap-2">
          {['US', 'UK', 'EU'].map((m) => (
            <Chip key={m} label={m} selected={market === m} onClick={() => setMarket(m)} />
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Write your message or tap AI Generate…"
        className="w-full rounded-xl bg-bg-soft border border-border-soft p-3.5 text-sm outline-none focus:border-amber resize-none"
      />
      {notice && <p className="text-xs text-amber">{notice}</p>}
      <div className="flex gap-2.5">
        <button
          onClick={generate}
          disabled={generateDraft.isPending}
          className="flex-1 rounded-xl bg-amber/15 text-amber font-semibold text-sm py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles size={16} /> {generateDraft.isPending ? 'Generating…' : 'AI Generate'}
        </button>
        <button
          onClick={send}
          disabled={sendMessage.isPending}
          className="flex-1 rounded-xl bg-amber text-[#221604] font-semibold text-sm py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <SendIcon size={16} /> Send
        </button>
      </div>
    </Card>
  );
}

export function OutreachComposerPage() {
  const [tab, setTab] = useState(0);
  const { data: inbox, refetch } = useInbox();

  const sent = (inbox || []).filter((m) => m.status === 'sent' || m.status === 'replied').length;
  const replied = (inbox || []).filter((m) => m.status === 'replied').length;
  const drafts = (inbox || []).filter((m) => m.status === 'draft').length;
  const rate = sent === 0 ? 0 : Math.round((replied / sent) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare size={22} className="text-amber" /> Outreach Composer
          </h1>
          <p className="text-sm text-text-muted mt-1">Unified inbox, AI drafts, every channel.</p>
        </div>
        <IconButton icon={RefreshCw} onClick={() => refetch()} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Drafts', drafts],
          ['Sent', sent],
          ['Replies', replied],
          ['Rate', `${rate}%`],
        ].map(([label, value]) => (
          <div key={label as string} className="text-center">
            <p className="font-mono-tab text-xl font-bold text-amber">{value}</p>
            <p className="text-[11px] text-text-faint">{label as string}</p>
          </div>
        ))}
      </div>

      <TabBar tabs={['Inbox', 'Compose', 'Templates']} active={tab} onChange={setTab} />

      {tab === 0 && <InboxTab />}
      {tab === 1 && <ComposeTab />}
      {tab === 2 && <TemplatesTab />}
    </div>
  );
}
