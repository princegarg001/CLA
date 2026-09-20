import { useState } from 'react';
import { MessageSquare, RefreshCw, Send, Sparkles, Copy, Check, Trash2, AlertTriangle, MailCheck, CornerDownRight, Clock, Inbox, Settings2, FileText, Plug } from 'lucide-react';
import {
  useDeleteMessage,
  useDeleteTemplate,
  useDraftThreadReply,
  useGenerateDraft,
  useMarkSent,
  useOutreachOverview,
  useRecordReply,
  useReplyToThread,
  useRunFollowups,
  useSaveDraft,
  useSaveOutreachSettings,
  useSaveTemplate,
  useSendMessage,
  useSuppressed,
  useSyncReplies,
  useTemplates,
  useUnsuppress,
  useUpdateMessage,
  useVerifyEmail,
  type OutreachThread,
} from '../../data/hooks/useOutreach';
import { useCreateLead, useLeads } from '../../data/hooks/useLeads';
import { Card, TabBar, IconButton, LoadingState, EmptyState, ErrorState, Badge, AccentButton } from '../../components/ui';
import { leadDisplayName, type MessageTemplate, type OutreachMessage } from '../../data/types';

const TONES: [string, string][] = [
  ['Technical', 'technical'],
  ['Casual', 'casual'],
  ['Formal', 'formal'],
  ['Founder-to-founder', 'founder_to_founder'],
];
const CHANNELS: [string, string][] = [
  ['Email', 'email'],
  ['LinkedIn', 'linkedin'],
  ['Twitter DM', 'twitter_dm'],
  ['Contact form', 'contact_form'],
];

const isEmailChannel = (c: string) => c === 'email' || c === 'apollo_email';

function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function inTime(iso?: string | null): string {
  if (!iso) return '';
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (min <= 0) return 'due now';
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.round(h / 24)}d`;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${selected ? 'border-amber bg-amber/12 text-amber font-semibold' : 'border-border-soft text-text-muted'}`}
    >
      {label}
    </button>
  );
}

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

const STATUS_TONE: Record<string, 'success' | 'info' | 'muted' | 'critical' | 'warning'> = {
  replied: 'success',
  received: 'success',
  sent: 'info',
  sending: 'warning',
  draft: 'muted',
  failed: 'critical',
};

// ---- one message in a conversation ---------------------------------------------------

function MessageItem({ m, threadEmail }: { m: OutreachMessage; threadEmail?: string | null }) {
  const update = useUpdateMessage();
  const send = useSendMessage();
  const markSent = useMarkSent();
  const del = useDeleteMessage();
  const reply = useRecordReply();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(m.subject || '');
  const [body, setBody] = useState(m.body);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inbound = m.direction === 'inbound';
  const editable = m.status === 'draft' || m.status === 'failed';
  const email = isEmailChannel(m.channel);
  const to = m.meta?.to || threadEmail;
  const busy = update.isPending || send.isPending || markSent.isPending || del.isPending || reply.isPending;

  async function doSend() {
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: m.id, subject, body });
        setEditing(false);
      }
      if (!window.confirm(`Send this email to ${to || 'the lead'} now?\n\nSubject: ${subject || m.subject}`)) return;
      try {
        await send.mutateAsync({ id: m.id });
      } catch (e) {
        if (/already emailed/i.test(errText(e)) && window.confirm(`${errText(e)}\n\nSend anyway?`)) await send.mutateAsync({ id: m.id, force: true });
        else throw e;
      }
    } catch (e) {
      setError(errText(e));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(m.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is selectable */
    }
  }

  async function theyReplied() {
    const text = window.prompt('Paste what they said (optional). Leave empty to just mark it as replied.') ?? null;
    if (text === null) return;
    try {
      await reply.mutateAsync({ id: m.id, text: text || undefined });
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[92%] sm:max-w-[80%] w-full rounded-2xl border p-3.5 ${inbound ? 'bg-success-bg/40 border-success/30' : m.status === 'draft' ? 'bg-bg-soft border-dashed border-border' : 'bg-surface border-border-soft'}`}>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-faint mb-1.5">
          {inbound ? <CornerDownRight size={12} /> : <Send size={12} />}
          <span className="font-semibold text-text-muted">{inbound ? `They wrote${m.meta?.from ? ` (${m.meta.from})` : ''}` : email ? `To ${to || 'no address'}` : `Via ${m.channel.replace('_', ' ')}`}</span>
          <Badge tone={STATUS_TONE[m.status] || 'muted'}>{m.status === 'draft' && m.meta?.followupOf ? `Follow-up ${m.meta.followupStep || ''} draft` : m.status}</Badge>
          {m.meta?.manual && <span>sent by you outside CLA</span>}
          <span className="ml-auto">{relativeTime(m.sent_at || m.created_at)}</span>
        </div>

        {editing ? (
          <div className="space-y-2">
            {email && <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-xs outline-none focus:border-amber" />}
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-xs outline-none focus:border-amber resize-y" />
          </div>
        ) : (
          <>
            {m.subject && <p className="text-xs font-semibold mb-1">{m.subject}</p>}
            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
          </>
        )}

        {inbound && m.meta?.intent && (
          <p className="mt-2 text-xs text-amber flex items-start gap-1.5">
            <Sparkles size={12} className="mt-0.5 shrink-0" /> {m.meta.intent.replace('_', ' ')}
            {m.meta.next ? `: ${m.meta.next}` : ''}
          </p>
        )}
        {m.meta?.lastError && <p className="mt-2 text-xs text-critical flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {m.meta.lastError}</p>}
        {error && <p className="mt-2 text-xs text-critical">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {editable && (
            <>
              {email ? (
                <button onClick={doSend} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-amber text-[#221604] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                  <Send size={12} /> {send.isPending ? 'Sending…' : 'Send email'}
                </button>
              ) : (
                <>
                  <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => markSent.mutate(m.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-success-bg text-success px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    <Check size={12} /> I sent it
                  </button>
                </>
              )}
              {editing ? (
                <button
                  onClick={async () => {
                    setError(null);
                    try {
                      await update.mutateAsync({ id: m.id, subject, body });
                      setEditing(false);
                    } catch (e) {
                      setError(errText(e));
                    }
                  }}
                  disabled={busy}
                  className="rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber"
                >
                  Save changes
                </button>
              ) : (
                <button onClick={() => setEditing(true)} className="rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber">
                  Edit
                </button>
              )}
              <button
                onClick={() => window.confirm('Delete this draft?') && del.mutate(m.id)}
                disabled={busy}
                className="ml-auto inline-flex items-center gap-1 text-xs text-text-faint hover:text-critical"
              >
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
          {m.direction === 'outbound' && m.status === 'sent' && (
            <>
              {m.meta?.nextFollowupAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-text-faint">
                  <Clock size={11} /> next follow-up {inTime(m.meta.nextFollowupAt)}
                </span>
              )}
              <button onClick={theyReplied} disabled={busy} className="ml-auto rounded-lg bg-success-bg text-success px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                They replied
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- reply inside a conversation ------------------------------------------------------

// Who the next email would go to: the address the last reply came from, else where we last wrote.
function replyTarget(t: OutreachThread): string | null {
  const inbound = [...t.messages].reverse().find((m) => m.direction === 'inbound' && m.meta?.from);
  if (inbound?.meta?.from) return inbound.meta.from;
  const out = [...t.messages].reverse().find((m) => m.direction === 'outbound' && isEmailChannel(m.channel) && m.meta?.to && (m.status === 'sent' || m.status === 'replied'));
  return out?.meta?.to || null;
}

function ReplyBox({ t }: { t: OutreachThread }) {
  const draftReply = useDraftThreadReply();
  const reply = useReplyToThread();
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const to = replyTarget(t);
  if (!t.lead || !to) return null;
  const leadId = t.lead.id;

  async function suggest() {
    setNote(null);
    try {
      const d = await draftReply.mutateAsync(leadId);
      setText(d.reply);
      if (!d.ai) setNote({ ok: true, text: 'The AI was unavailable, so this is a standard reply. Personalise it before sending.' });
    } catch (e) {
      setNote({ ok: false, text: errText(e) });
    }
  }

  async function send() {
    if (!text.trim()) return;
    if (!window.confirm(`Send this reply to ${to} now?`)) return;
    setNote(null);
    try {
      await reply.mutateAsync({ leadId, body: text });
      setText('');
      setNote({ ok: true, text: `Sent to ${to}.` });
    } catch (e) {
      setNote({ ok: false, text: errText(e) });
    }
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-bg-soft p-3.5 space-y-2.5">
      <p className="text-[11px] font-semibold text-text-muted">
        Reply to {to} <span className="font-normal text-text-faint">(sent in the same thread)</span>
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Write your reply…" className="w-full rounded-lg bg-surface border border-border-soft p-2.5 text-sm outline-none focus:border-amber resize-y" />
      {note && <p className={`text-xs ${note.ok ? 'text-success' : 'text-critical'}`}>{note.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={suggest} disabled={draftReply.isPending || reply.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-amber/50 text-amber px-3 py-1.5 text-xs font-semibold hover:bg-amber/10 disabled:opacity-50">
          <Sparkles size={12} /> {draftReply.isPending ? 'Drafting…' : 'Draft a reply with AI'}
        </button>
        <button onClick={send} disabled={reply.isPending || draftReply.isPending || !text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-amber text-[#221604] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
          <Send size={12} /> {reply.isPending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}

// ---- conversations --------------------------------------------------------------------

function ThreadCard({ t }: { t: OutreachThread }) {
  const [open, setOpen] = useState(t.awaitingYou || t.hasDraft);
  const name = t.lead ? t.lead.name || t.lead.email || '' : 'No lead attached';
  const last = t.messages[t.messages.length - 1];
  return (
    <Card className="p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{t.lead?.company || name}</p>
            {t.lead?.company && name && <span className="text-xs text-text-faint truncate">{name}</span>}
            {t.awaitingYou && <Badge tone="success">Reply to them</Badge>}
            {t.hasDraft && <Badge tone="warning">Draft</Badge>}
            {t.lead && <Badge tone="muted">{t.lead.status.replace('_', ' ')}</Badge>}
          </div>
          <p className="text-xs text-text-faint truncate mt-0.5">{last?.subject || last?.body.slice(0, 90)}</p>
        </div>
        <span className="text-[11px] text-text-faint shrink-0">{relativeTime(t.lastActivity)}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {t.messages.map((m) => (
            <MessageItem key={m.id} m={m} threadEmail={t.lead?.email} />
          ))}
          <ReplyBox t={t} />
        </div>
      )}
    </Card>
  );
}

function ConversationsTab({ threads }: { threads: OutreachThread[] }) {
  const [filter, setFilter] = useState(0);
  const [q, setQ] = useState('');
  const filters = ['All', 'Reply to them', 'Drafts', 'Waiting on them'];
  const shown = threads
    .filter((t) => (filter === 1 ? t.awaitingYou : filter === 2 ? t.hasDraft : filter === 3 ? !t.awaitingYou && t.messages.some((m) => m.status === 'sent') : true))
    .filter((t) => !q.trim() || `${t.lead?.company || ''} ${t.lead?.name || ''} ${t.lead?.email || ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f, i) => (
          <Chip key={f} label={f} selected={filter === i} onClick={() => setFilter(i)} />
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or email" className="ml-auto w-full sm:w-64 rounded-lg bg-bg-soft border border-border-soft px-3 py-1.5 text-xs outline-none focus:border-amber" />
      </div>
      {shown.length === 0 ? <EmptyState text={threads.length ? 'Nothing matches.' : 'No conversations yet. Compose a message or send one from Daily Leads.'} /> : shown.map((t) => <ThreadCard key={t.key} t={t} />)}
    </div>
  );
}

// ---- compose --------------------------------------------------------------------------

function ComposeTab({ mailReady }: { mailReady: boolean }) {
  const { data: leads } = useLeads();
  const { data: templates } = useTemplates();
  const generate = useGenerateDraft();
  const saveDraft = useSaveDraft();
  const update = useUpdateMessage();
  const send = useSendMessage();
  const markSent = useMarkSent();
  const createLead = useCreateLead();

  const [leadId, setLeadId] = useState('');
  const [newContact, setNewContact] = useState<{ name: string; company: string; email: string } | null>(null);
  const [channel, setChannel] = useState('email');
  const [tone, setTone] = useState('founder_to_founder');
  const [market, setMarket] = useState('US');
  const [templateId, setTemplateId] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const lead = (leads || []).find((l) => l.id === leadId);
  const email = isEmailChannel(channel);
  const busy = generate.isPending || saveDraft.isPending || update.isPending || send.isPending || markSent.isPending;

  async function saveNewContact() {
    if (!newContact) return;
    setNotice(null);
    try {
      const created = await createLead.mutateAsync({ name: newContact.name.trim() || undefined, company: newContact.company.trim() || undefined, email: newContact.email.trim() });
      setNewContact(null);
      setLeadId(created.id);
      setTo(created.email || newContact.email.trim());
      setNotice({ ok: true, text: 'Contact saved. Now generate or write your message.' });
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    }
  }

  function pickLead(id: string) {
    if (id === '__new__') {
      setNewContact({ name: '', company: '', email: '' });
      setLeadId('');
      setDraftId(null);
      return;
    }
    setNewContact(null);
    setLeadId(id);
    setDraftId(null);
    setSubject('');
    setBody('');
    setNotice(null);
    setTo((leads || []).find((l) => l.id === id)?.email || '');
  }

  async function doGenerate() {
    if (!leadId) return setNotice({ ok: false, text: 'Choose a lead first.' });
    setNotice(null);
    try {
      const d = await generate.mutateAsync({ leadId, tone, market, channel, templateId: templateId || undefined });
      setDraftId(d.id);
      setSubject(d.subject || '');
      setBody(d.body);
      if (!d.ai_generated) setNotice({ ok: true, text: templateId ? 'Filled from your template.' : 'The AI was unavailable, so this is the standard template. Personalise it before sending.' });
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    }
  }

  // Saves whatever is in the editor as the current draft and returns its id.
  async function persist(): Promise<string> {
    if (draftId) {
      await update.mutateAsync({ id: draftId, subject, body, to, channel });
      return draftId;
    }
    const d = await saveDraft.mutateAsync({ leadId: leadId || undefined, channel, subject, body, to: to || undefined });
    setDraftId(d.id);
    return d.id;
  }

  async function doSend() {
    if (!body.trim()) return setNotice({ ok: false, text: 'Write or generate a message first.' });
    if (email && !subject.trim()) return setNotice({ ok: false, text: 'Add a subject.' });
    setNotice(null);
    try {
      const id = await persist();
      if (!window.confirm(`Send this email to ${to || 'the lead'} now?\n\nSubject: ${subject}`)) return;
      try {
        await send.mutateAsync({ id });
      } catch (e) {
        if (/already emailed/i.test(errText(e)) && window.confirm(`${errText(e)}\n\nSend anyway?`)) await send.mutateAsync({ id, force: true });
        else throw e;
      }
      setNotice({ ok: true, text: `Sent to ${to}. Replies will appear in Conversations.` });
      setDraftId(null);
      setBody('');
      setSubject('');
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    }
  }

  async function doMarkSent() {
    if (!body.trim()) return;
    try {
      const id = await persist();
      await markSent.mutateAsync(id);
      setNotice({ ok: true, text: 'Recorded. A follow-up reminder is scheduled.' });
      setDraftId(null);
      setBody('');
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <p className="text-[15px] font-bold">New message</p>
      <div>
        <label className="text-xs font-semibold text-text-muted block mb-1.5">To</label>
        <select value={newContact ? '__new__' : leadId} onChange={(e) => pickLead(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2.5 text-sm outline-none focus:border-amber">
          <option value="">Select a lead…</option>
          <option value="__new__">＋ New contact (someone not in my leads)</option>
          {(leads || []).filter((l) => l.status !== 'closed_lost').map((l) => (
            <option key={l.id} value={l.id}>
              {l.name ? `${l.name}${l.company ? ` · ${l.company}` : ''}` : l.company || l.email || leadDisplayName(l)} ({l.score}/10)
            </option>
          ))}
        </select>
        {newContact && (
          <div className="mt-3 rounded-xl border border-border-soft p-3 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name" className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
              <input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} placeholder="Company" className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
              <input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email address" className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
            </div>
            <AccentButton label="Save contact" loading={createLead.isPending} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newContact.email.trim())} onClick={saveNewContact} />
            <p className="text-[11px] text-text-faint">Saved to your leads, so its emails and replies stay together under this contact.</p>
          </div>
        )}
        {lead && !lead.email && email && <p className="text-xs text-warning mt-1.5">This lead has no email address saved. If you type one below, the conversation is filed under this lead. To email a different person, choose "New contact" above.</p>}
        {lead && lead.email && email && to.trim() && to.trim().toLowerCase() !== lead.email.toLowerCase() && (
          <p className="text-xs text-warning mt-1.5">This address differs from {lead.name || lead.company}'s saved email ({lead.email}). The conversation and any reply will be filed under this lead.</p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">Channel</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(([label, value]) => (
              <Chip key={value} label={label} selected={channel === value} onClick={() => setChannel(value)} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">Start from</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber">
            <option value="">AI draft</option>
            {(templates || []).map((t) => (
              <option key={t.id} value={t.id}>
                Template: {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!templateId && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(([label, value]) => (
                <Chip key={value} label={label} selected={tone === value} onClick={() => setTone(value)} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">Target market</label>
            <div className="flex gap-2">
              {['US', 'UK', 'EU'].map((m) => (
                <Chip key={m} label={m} selected={market === m} onClick={() => setMarket(m)} />
              ))}
            </div>
          </div>
        </div>
      )}
      <AccentButton label={draftId ? 'Regenerate' : templateId ? 'Fill from template' : 'Generate draft'} icon={Sparkles} loading={generate.isPending} onClick={doGenerate} variant="outline" />

      <div className="space-y-2 pt-1">
        {email && (
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient email" className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
          </div>
        )}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} placeholder="Generate a draft above, or write your own here…" className="w-full rounded-xl bg-bg-soft border border-border-soft p-3 text-sm outline-none focus:border-amber resize-y" />
        {email && <p className="text-[11px] text-text-faint">Your signature and the opt-out line from Setup are added automatically when it is sent.</p>}
      </div>

      {notice && <p className={`text-sm ${notice.ok ? 'text-success' : 'text-critical'}`}>{notice.text}</p>}

      <div className="flex flex-wrap gap-2">
        {email ? (
          <AccentButton label={mailReady ? 'Send email' : 'Email not set up'} icon={Send} loading={send.isPending} disabled={busy || !mailReady || !body.trim()} onClick={doSend} />
        ) : (
          <>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard blocked */
                }
              }}
              disabled={!body.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-border-soft px-4 py-2.5 text-sm font-semibold hover:border-amber disabled:opacity-50"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy message'}
            </button>
            <AccentButton label="I sent it" icon={Check} loading={markSent.isPending} disabled={busy || !body.trim()} onClick={doMarkSent} />
          </>
        )}
        <button
          onClick={async () => {
            if (!body.trim()) return;
            try {
              await persist();
              setNotice({ ok: true, text: 'Saved as a draft in Conversations.' });
            } catch (e) {
              setNotice({ ok: false, text: errText(e) });
            }
          }}
          disabled={busy || !body.trim()}
          className="rounded-xl border border-border-soft px-4 py-2.5 text-sm font-semibold hover:border-amber disabled:opacity-50"
        >
          Save draft
        </button>
      </div>
    </Card>
  );
}

// ---- follow-ups -----------------------------------------------------------------------

function FollowupsTab({ threads }: { threads: OutreachThread[] }) {
  const run = useRunFollowups();
  const [note, setNote] = useState<string | null>(null);
  const drafts = threads.flatMap((t) => t.messages.filter((m) => m.status === 'draft' && m.meta?.followupOf).map((m) => ({ m, t })));
  const upcoming = threads
    .flatMap((t) => t.messages.filter((m) => m.status === 'sent' && m.meta?.nextFollowupAt).map((m) => ({ m, t })))
    .sort((a, b) => new Date(a.m.meta!.nextFollowupAt!).getTime() - new Date(b.m.meta!.nextFollowupAt!).getTime());

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[15px] font-bold">Follow-ups</p>
          <p className="text-xs text-text-faint">People who have not replied get a short follow-up drafted automatically. You approve each one, unless auto-send is on in Setup.</p>
        </div>
        <AccentButton
          label="Check for due follow-ups"
          icon={RefreshCw}
          loading={run.isPending}
          variant="outline"
          onClick={async () => {
            const r = await run.mutateAsync();
            setNote(r.due ? `${r.drafted} drafted${r.sent ? `, ${r.sent} sent` : ''}.` : 'Nothing is due yet.');
          }}
        />
      </div>
      {note && <p className="text-xs text-text-muted">{note}</p>}

      <div className="space-y-3">
        <p className="text-sm font-semibold">Ready to review ({drafts.length})</p>
        {drafts.length === 0 ? <EmptyState text="No follow-up drafts waiting." /> : drafts.map(({ m, t }) => (
          <div key={m.id}>
            <p className="text-xs text-text-faint mb-1.5">{t.lead?.company || t.lead?.name || 'Lead'}</p>
            <MessageItem m={m} threadEmail={t.lead?.email} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Scheduled ({upcoming.length})</p>
        {upcoming.length === 0 ? <EmptyState text="No follow-ups are scheduled." /> : upcoming.map(({ m, t }) => (
          <Card key={m.id} className="p-3 flex items-center gap-3">
            <Clock size={14} className="text-amber shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{t.lead?.company || t.lead?.name || m.meta?.to}</p>
              <p className="text-xs text-text-faint truncate">{m.subject || m.body.slice(0, 60)}</p>
            </div>
            <span className="text-xs text-text-muted">{inTime(m.meta?.nextFollowupAt)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- templates ------------------------------------------------------------------------

function TemplatesTab() {
  const { data, isLoading } = useTemplates();
  const save = useSaveTemplate();
  const del = useDeleteTemplate();
  const [editing, setEditing] = useState<Partial<MessageTemplate> | null>(null);

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-faint">
          Use <code className="text-amber">{'{{first_name}}'}</code> <code className="text-amber">{'{{company}}'}</code> <code className="text-amber">{'{{role}}'}</code>. Start with a line <code className="text-amber">Subject: …</code> to set the subject.
        </p>
        <AccentButton label="New template" icon={FileText} variant="outline" onClick={() => setEditing({ name: '', body: 'Subject: \n\nHi {{first_name}},\n\n' })} />
      </div>

      {editing && (
        <Card className="p-4 space-y-3">
          <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Template name" className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
          <textarea value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={9} className="w-full rounded-lg bg-bg-soft border border-border-soft p-3 text-sm outline-none focus:border-amber resize-y" />
          <div className="flex gap-2">
            <AccentButton
              label="Save template"
              loading={save.isPending}
              disabled={!editing.name?.trim() || !editing.body?.trim()}
              onClick={async () => {
                await save.mutateAsync({ id: editing.id, name: editing.name!.trim(), body: editing.body!, category: editing.category || undefined, tone: editing.tone || undefined, market: editing.market || undefined });
                setEditing(null);
              }}
            />
            <button onClick={() => setEditing(null)} className="rounded-xl px-4 py-2.5 text-sm text-text-muted">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {!data?.length ? (
        <EmptyState text="No templates yet. Save a message that worked so you can reuse it." />
      ) : (
        data.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm flex-1">{t.name}</p>
              <button onClick={() => setEditing(t)} className="text-xs text-amber hover:underline">
                Edit
              </button>
              <button onClick={() => window.confirm(`Delete "${t.name}"?`) && del.mutate(t.id)} className="text-xs text-text-faint hover:text-critical">
                <Trash2 size={13} />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 whitespace-pre-wrap line-clamp-4">{t.body}</p>
          </Card>
        ))
      )}
    </div>
  );
}

// ---- setup ----------------------------------------------------------------------------

function SetupTab({ overview }: { overview: NonNullable<ReturnType<typeof useOutreachOverview>['data']> }) {
  const { mail, settings, lastSync } = overview;
  const verify = useVerifyEmail();
  const save = useSaveOutreachSettings();
  const sync = useSyncReplies();
  const { data: suppressed } = useSuppressed();
  const unsuppress = useUnsuppress();

  const [dailyCap, setDailyCap] = useState(String(settings.dailyCap));
  const [minDays, setMinDays] = useState(String(settings.minDaysBetweenContacts));
  const [days, setDays] = useState(settings.followupDays.join(', '));
  const [maxFollowups, setMaxFollowups] = useState(String(settings.maxFollowups));
  const [auto, setAuto] = useState(settings.autoSendFollowups);
  const [signature, setSignature] = useState(settings.signature);
  const [footer, setFooter] = useState(settings.footer);
  const [address, setAddress] = useState(settings.postalAddress);
  const [saved, setSaved] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const v = verify.data;
  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-amber" />
          <p className="text-[15px] font-bold">Mailbox</p>
        </div>
        {mail.smtp.configured ? (
          <p className="text-sm">
            Sending from <span className="font-semibold">{mail.smtp.from}</span> via {mail.smtp.via === 'resend' ? 'Resend' : mail.smtp.via === 'brevo' ? 'Brevo' : 'SMTP'}. Replies are read from {mail.imap.host || 'the same mailbox'}.
          </p>
        ) : (
          <div className="text-sm space-y-2">
            <p className="text-warning">Email sending is not connected yet. The recommended way (free, works on any host) is an email service:</p>
            <ol className="list-decimal pl-5 text-xs text-text-muted space-y-1">
              <li>Create a free account at resend.com, add your domain, and add the DNS records it shows you (in GoDaddy: DNS).</li>
              <li>Create an API key in Resend.</li>
              <li>On Render add the variables below, then save.</li>
            </ol>
            <pre className="rounded-lg bg-bg-soft border border-border-soft p-3 text-xs overflow-x-auto">{`RESEND_API_KEY=re_xxxxxxxx
SMTP_USER=support@yourdomain.com   (the From address)
SMTP_FROM_NAME=Your Name

# to read replies from your mailbox:
SMTP_HOST=smtpout.secureserver.net
SMTP_PASS=<mailbox password>
IMAP_HOST=imap.titan.email`}</pre>
            <p className="text-xs text-text-faint">Replies go to your normal mailbox and CLA reads them from there. Plain SMTP also works on hosts that allow it (not Render's free plan).</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <AccentButton label="Test connection" icon={MailCheck} variant="outline" loading={verify.isPending} disabled={!mail.smtp.configured} onClick={() => verify.mutate()} />
          <AccentButton
            label="Check for replies now"
            icon={Inbox}
            variant="outline"
            loading={sync.isPending}
            disabled={!mail.imap.configured}
            onClick={async () => {
              const r = await sync.mutateAsync();
              setSyncNote(r.skipped || `${r.checked} emails checked: ${r.replies} replies, ${r.bounces} bounces, ${r.unsubscribes} opt-outs.`);
            }}
          />
        </div>
        {v && (
          <div className="text-xs space-y-1">
            <p className={v.smtp.ok ? 'text-success' : 'text-critical'}>Sending{v.smtp.via && v.smtp.via !== 'smtp' ? ` (${v.smtp.via})` : ''}: {v.smtp.ok ? 'works' : v.smtp.error || 'not configured'}</p>
            <p className={v.imap.ok ? 'text-success' : 'text-critical'}>Reading replies: {v.imap.ok ? 'works' : v.imap.error || 'not configured'}</p>
          </div>
        )}
        {syncNote && <p className="text-xs text-text-muted">{syncNote}</p>}
        <p className="text-[11px] text-text-faint">Last checked for replies: {lastSync ? relativeTime(lastSync) : 'never'} (checked automatically every 10 minutes).</p>
      </Card>

      <Card className="p-5 space-y-4">
        <p className="text-[15px] font-bold">Sending rules</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Emails per day (max)</label>
            <input type="number" min={1} max={200} value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
            <p className="text-[11px] text-text-faint mt-1">Keep it low (20-30). Cold email from a personal mailbox gets flagged as spam above that.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Don't cold-email the same lead again for (days)</label>
            <input type="number" min={0} max={180} value={minDays} onChange={(e) => setMinDays(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Follow up after (days, comma separated)</label>
            <input value={days} onChange={(e) => setDays(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Maximum follow-ups</label>
            <input type="number" min={0} max={4} value={maxFollowups} onChange={(e) => setMaxFollowups(e.target.value)} className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="mt-1 accent-amber" />
          <span>
            Send follow-ups automatically on weekday business hours
            <span className="block text-[11px] text-text-faint">Off by default: follow-ups wait for your approval. Anyone who replies or opts out is never followed up.</span>
          </span>
        </label>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Signature</label>
          <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} placeholder={'Prince\nAlphoTech · alphotech.com'} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-sm outline-none focus:border-amber" />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Opt-out line (added to every email)</label>
          <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={2} className="w-full rounded-lg bg-bg-soft border border-border-soft p-2.5 text-sm outline-none focus:border-amber" />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Postal address (recommended)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Business address. Many countries require one on commercial email." className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber" />
        </div>
        <AccentButton
          label={saved ? 'Saved' : 'Save rules'}
          icon={Settings2}
          loading={save.isPending}
          onClick={async () => {
            await save.mutateAsync({
              dailyCap: Number(dailyCap),
              minDaysBetweenContacts: Number(minDays),
              followupDays: days.split(',').map((d) => Number(d.trim())).filter((n) => Number.isFinite(n) && n > 0),
              maxFollowups: Number(maxFollowups),
              autoSendFollowups: auto,
              signature,
              footer,
              postalAddress: address,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        />
      </Card>

      <Card className="p-5">
        <p className="text-[15px] font-bold">Do-not-contact list</p>
        <p className="text-xs text-text-faint mb-3">Added automatically when someone asks to stop or an address bounces. CLA will refuse to email these.</p>
        {!suppressed?.length ? (
          <p className="text-xs text-text-muted">Nobody yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suppressed.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1 text-xs">
                {e}
                <button onClick={() => window.confirm(`Allow emailing ${e} again?`) && unsuppress.mutate(e)} className="text-text-faint hover:text-critical" title="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- page -----------------------------------------------------------------------------

export function OutreachComposerPage() {
  const { data, isLoading, error, refetch, isFetching } = useOutreachOverview();
  const sync = useSyncReplies();
  const [tab, setTab] = useState(0);

  const stats = data?.stats;
  const needsMailSetup = !!data && !data.mail.smtp.configured;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare size={22} className="text-amber" /> Outreach
          </h1>
          <p className="text-sm text-text-muted mt-1">Write, send from your own mailbox, and track every reply.</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.mail.imap.configured && (
            <button onClick={() => sync.mutate()} disabled={sync.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-2.5 text-xs font-medium hover:border-amber disabled:opacity-50">
              <Inbox size={14} /> {sync.isPending ? 'Checking…' : 'Check replies'}
            </button>
          )}
          <IconButton icon={RefreshCw} onClick={() => refetch()} active={isFetching} />
        </div>
      </div>

      {needsMailSetup && (
        <div className="rounded-xl border border-warning/40 bg-warning-bg px-4 py-3 text-xs flex items-center gap-2.5">
          <AlertTriangle size={15} className="text-warning shrink-0" />
          <p>
            Email sending is not connected yet, so messages can be written and tracked but not sent from here.{' '}
            <button onClick={() => setTab(4)} className="text-amber font-semibold hover:underline">
              Set it up
            </button>
          </p>
        </div>
      )}
      {sync.data && (
        <p className="text-xs text-text-muted">{sync.data.skipped || `${sync.data.checked} emails checked: ${sync.data.replies} replies, ${sync.data.bounces} bounces, ${sync.data.unsubscribes} opt-outs.`}</p>
      )}
      {sync.isError && <p className="text-xs text-critical">{errText(sync.error)}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['People contacted', stats.peopleContacted],
            ['Replies', stats.replies],
            ['Reply rate', `${stats.replyRate}%`],
            ['Follow-ups waiting', stats.followupsWaiting],
            ['Sent today', `${stats.sentLast24h}/${stats.dailyCap}`],
          ].map(([label, value]) => (
            <div key={label as string} className="text-center">
              <p className="font-mono-tab text-xl font-bold text-amber">{value as string | number}</p>
              <p className="text-[11px] text-text-faint">{label as string}</p>
            </div>
          ))}
        </div>
      )}
      {stats && (stats.bounced > 0 || stats.failed > 0) && (
        <p className="text-xs text-warning">
          {stats.bounced} bounced, {stats.failed} failed to send. Open Conversations to see which.
        </p>
      )}

      <TabBar tabs={['Conversations', 'Compose', `Follow-ups${stats?.followupsWaiting ? ` (${stats.followupsWaiting})` : ''}`, 'Templates', 'Setup']} active={tab} onChange={setTab} />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={errText(error)} onRetry={() => refetch()} />
      ) : data ? (
        <>
          {tab === 0 && <ConversationsTab threads={data.threads} />}
          {tab === 1 && <ComposeTab mailReady={data.mail.smtp.configured} />}
          {tab === 2 && <FollowupsTab threads={data.threads} />}
          {tab === 3 && <TemplatesTab />}
          {tab === 4 && <SetupTab overview={data} />}
        </>
      ) : null}
    </div>
  );
}
