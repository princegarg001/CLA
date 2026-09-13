import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Sparkles,
  Plus,
  Play,
  Square,
  Flag,
  Clock,
  Calendar,
  ReceiptText,
  CheckCircle2,
  Quote,
  Copy,
  Building2,
  Mail,
  PhoneCall,
  MessageCircle,
} from 'lucide-react';
import { useAddInvoice, useAddMilestone, useAddProject, useAddTestimonial, useClient, useLogCommunication, useMarkInvoicePaid, useReengageDraft, useToggleTimer } from '../../data/hooks/useClients';
import { Card, TabBar, StatCard, Badge, AccentButton, LoadingState, EmptyState } from '../../components/ui';
import { Modal, ModalField, modalInputClass } from '../../components/Modal';
import type { Invoice, Project } from '../../data/types';

function healthColor(score: number) {
  if (score >= 8) return 'text-success';
  if (score >= 6) return 'text-warning';
  return 'text-critical';
}

function OverviewTab({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const logComm = useLogCommunication();
  const reengage = useReengageDraft();
  const [logOpen, setLogOpen] = useState(false);
  const [logText, setLogText] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  if (!client) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">Health Score</p>
          <span className={`font-mono-tab text-base font-extrabold ${healthColor(client.health_score)}`}>{client.health_score}/10</span>
        </div>
        {client.health_reason && <p className="text-xs text-text-muted mt-1.5">{client.health_reason}</p>}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ReceiptText} label="Total Revenue" value={`$${Math.round(client.total_revenue)}`} />
        <StatCard icon={Building2} label="Projects" value={`${client.total_projects}`} />
      </div>
      <Card className="p-4 space-y-2.5">
        <p className="text-[15px] font-bold mb-1">Contact</p>
        {client.company && (
          <p className="flex items-center gap-2 text-sm">
            <Building2 size={14} className="text-text-faint" /> {client.company}
          </p>
        )}
        {client.email && (
          <p className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-text-faint" /> {client.email}
          </p>
        )}
        {client.phone && (
          <p className="flex items-center gap-2 text-sm">
            <PhoneCall size={14} className="text-text-faint" /> {client.phone}
          </p>
        )}
        {client.region && (
          <p className="flex items-center gap-2 text-sm">
            <Flag size={14} className="text-text-faint" /> {client.region}
          </p>
        )}
        {client.preferred_channel && (
          <p className="flex items-center gap-2 text-sm">
            <MessageCircle size={14} className="text-text-faint" /> Prefers {client.preferred_channel}
          </p>
        )}
      </Card>
      <div className="flex gap-2">
        <button onClick={() => setLogOpen(true)} className="flex-1 rounded-xl border border-amber/40 text-amber py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
          <Phone size={15} /> Log Call
        </button>
        <button
          onClick={async () => setDraft((await reengage.mutateAsync(clientId)).draft)}
          className="flex-1 rounded-xl border border-amber/40 text-amber py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Sparkles size={15} /> Draft Message
        </button>
      </div>
      {logOpen && (
        <Modal title="Log a call" onClose={() => setLogOpen(false)}>
          <textarea
            autoFocus
            rows={4}
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder="What happened?"
            className={modalInputClass}
          />
          <div className="mt-4">
            <AccentButton
              label="Save"
              onClick={() => {
                if (!logText.trim()) return;
                logComm.mutate({ clientId, channel: 'call', fullContent: logText.trim() });
                setLogOpen(false);
                setLogText('');
              }}
            />
          </div>
        </Modal>
      )}
      {draft && (
        <Modal title="AI-drafted message" onClose={() => setDraft(null)}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft}</p>
        </Modal>
      )}
    </div>
  );
}

function ProjectCard({ clientId, project, totalRevenue }: { clientId: string; project: Project; totalRevenue: number }) {
  const toggleTimer = useToggleTimer();
  const addMilestone = useAddMilestone();
  const [msOpen, setMsOpen] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msAmount, setMsAmount] = useState('');
  const progress = project.budget && project.budget > 0 ? Math.min(1, totalRevenue / project.budget) : null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm">{project.title}</p>
        <Badge tone="info">{project.status}</Badge>
      </div>
      {progress != null && (
        <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden mt-2.5">
          <div className="h-full bg-amber rounded-full" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-text-faint">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {project.hours_logged}h logged
        </span>
        {project.due_date && (
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Due {new Date(project.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => toggleTimer.mutate({ clientId, projectId: project.id, running: project.timer_started_at != null })}
          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 ${
            project.timer_started_at ? 'border-critical/40 text-critical' : 'border-amber/40 text-amber'
          }`}
        >
          {project.timer_started_at ? <Square size={12} /> : <Play size={12} />}
          {project.timer_started_at ? 'Stop Timer' : 'Start Timer'}
        </button>
        <button onClick={() => setMsOpen(true)} className="flex-1 rounded-lg border border-border-soft py-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
          <Flag size={12} /> Add Milestone
        </button>
      </div>
      {msOpen && (
        <Modal title="New Milestone" onClose={() => setMsOpen(false)}>
          <ModalField label="Title">
            <input autoFocus value={msTitle} onChange={(e) => setMsTitle(e.target.value)} className={modalInputClass} />
          </ModalField>
          <ModalField label="Amount (optional)">
            <input type="number" value={msAmount} onChange={(e) => setMsAmount(e.target.value)} className={modalInputClass} />
          </ModalField>
          <AccentButton
            label="Create"
            onClick={() => {
              if (!msTitle.trim()) return;
              addMilestone.mutate({ clientId, projectId: project.id, title: msTitle.trim(), amount: msAmount ? Number(msAmount) : undefined });
              setMsOpen(false);
              setMsTitle('');
              setMsAmount('');
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

function ProjectsTab({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const addProject = useAddProject();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  if (!client) return null;

  return (
    <div className="space-y-4">
      <AccentButton label="Add Project" icon={Plus} onClick={() => setOpen(true)} />
      {!client.projects?.length ? (
        <EmptyState text="No projects yet." />
      ) : (
        <div className="space-y-3">
          {client.projects.map((p) => (
            <ProjectCard key={p.id} clientId={clientId} project={p} totalRevenue={client.total_revenue} />
          ))}
        </div>
      )}
      {open && (
        <Modal title="New Project" onClose={() => setOpen(false)}>
          <ModalField label="Project title">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={modalInputClass} />
          </ModalField>
          <ModalField label="Budget (optional)">
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className={modalInputClass} />
          </ModalField>
          <AccentButton
            label="Create"
            onClick={() => {
              if (!title.trim()) return;
              addProject.mutate({ clientId, data: { title: title.trim(), status: 'active', budget: budget ? Number(budget) : undefined } });
              setOpen(false);
              setTitle('');
              setBudget('');
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TimelineTab({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  if (!client) return null;
  const sentimentColor = (s?: string | null) => (s === 'positive' ? 'text-success' : s === 'negative' ? 'text-critical' : 'text-text-faint');

  if (!client.recentTimeline?.length) return <EmptyState text="No communication logged yet." />;
  return (
    <div className="space-y-3">
      {client.recentTimeline.map((entry) => (
        <Card key={entry.id} className="p-4">
          <p className="text-sm">{entry.summary}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-text-faint">{entry.channel}</span>
            {entry.sentiment && <span className={`text-xs ${sentimentColor(entry.sentiment)}`}>· {entry.sentiment}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function InvoicesTab({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const addInvoice = useAddInvoice();
  const markPaid = useMarkInvoicePaid();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  if (!client) return null;

  const badgeTone = (status: Invoice['status']): 'success' | 'critical' | 'info' | 'warning' =>
    status === 'paid' ? 'success' : status === 'overdue' ? 'critical' : status === 'sent' ? 'info' : 'warning';

  return (
    <div className="space-y-4">
      <AccentButton label="Create Invoice" icon={ReceiptText} onClick={() => setOpen(true)} />
      {!client.invoices?.length ? (
        <EmptyState text="No invoices yet." />
      ) : (
        <div className="space-y-2">
          {client.invoices.map((inv) => (
            <Card key={inv.id} className="p-3.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm">
                  ${inv.amount} {inv.currency}
                </p>
                {inv.due_date && <p className="text-xs text-text-faint">Due {new Date(inv.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</p>}
              </div>
              <Badge tone={badgeTone(inv.status)}>{inv.status}</Badge>
              {inv.status !== 'paid' && (
                <button onClick={() => markPaid.mutate({ clientId, invoiceId: inv.id })} className="text-success">
                  <CheckCircle2 size={20} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
      {open && (
        <Modal title="New Invoice" onClose={() => setOpen(false)}>
          <ModalField label="Amount">
            <input autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={modalInputClass} />
          </ModalField>
          <AccentButton
            label="Create"
            onClick={() => {
              const n = Number(amount);
              if (!n) return;
              addInvoice.mutate({ clientId, amount: n });
              setOpen(false);
              setAmount('');
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TestimonialsTab({ clientId }: { clientId: string }) {
  const { data: client } = useClient(clientId);
  const addTestimonial = useAddTestimonial();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const [author, setAuthor] = useState(client?.name || '');
  const [title, setTitle] = useState('');
  if (!client) return null;

  return (
    <div className="space-y-4">
      <AccentButton label="Add Testimonial" icon={Quote} onClick={() => setOpen(true)} />
      {!client.testimonials?.length ? (
        <EmptyState text="No testimonials yet — ask after a project wraps up." />
      ) : (
        <div className="space-y-3">
          {client.testimonials.map((t) => (
            <Card key={t.id} className="p-4">
              <p className="text-sm italic leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center justify-between mt-2.5">
                <p className="text-xs font-semibold text-text-muted">{[t.author_name, t.author_title].filter(Boolean).join(' · ')}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(`"${t.quote}" — ${t.author_name || client.name}`)}
                  className="text-text-faint hover:text-amber"
                >
                  <Copy size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Add Testimonial" onClose={() => setOpen(false)}>
          <ModalField label="Quote">
            <textarea autoFocus rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} className={modalInputClass} />
          </ModalField>
          <ModalField label="Author name">
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className={modalInputClass} />
          </ModalField>
          <ModalField label="Author title (optional)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={modalInputClass} />
          </ModalField>
          <AccentButton
            label="Save"
            onClick={() => {
              if (!quote.trim()) return;
              addTestimonial.mutate({ clientId, quote: quote.trim(), authorName: author.trim() || undefined, authorTitle: title.trim() || undefined });
              setOpen(false);
              setQuote('');
              setTitle('');
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);
  const { data: client, isLoading } = useClient(id || null);

  if (isLoading && !client) return <LoadingState />;
  if (!client) return <EmptyState text="Client not found" />;

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-amber">
        <ArrowLeft size={15} /> Client Vault
      </Link>
      <h1 className="text-2xl font-bold">{client.name}</h1>
      <TabBar tabs={['Overview', 'Projects', 'Timeline', 'Invoices', 'Testimonials']} active={tab} onChange={setTab} />
      {tab === 0 && <OverviewTab clientId={client.id} />}
      {tab === 1 && <ProjectsTab clientId={client.id} />}
      {tab === 2 && <TimelineTab clientId={client.id} />}
      {tab === 3 && <InvoicesTab clientId={client.id} />}
      {tab === 4 && <TestimonialsTab clientId={client.id} />}
    </div>
  );
}
