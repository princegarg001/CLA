import { useState } from 'react';
import { Save, Link2, Unlink } from 'lucide-react';
import { config as appConfig } from '../../core/config';
import { useIntegrations } from '../../data/hooks/useSettings';
import { useConnectPlatform, useDisconnectPlatform, useSocialStatus } from '../../data/hooks/useSettings';
import { Card, SectionHeader, Badge, AccentButton, LoadingState } from '../../components/ui';

const META: Record<string, string> = {
  supabase: 'Supabase',
  openai: 'OpenAI (Groq)',
  apollo: 'Apollo.io',
  umami: 'Umami',
  sentry: 'Sentry',
  twitter: 'Twitter/X (read)',
  reddit: 'Reddit',
  upwork: 'Upwork',
  trustmrr: 'TrustMRR',
  gumroad: 'Gumroad',
  betalist: 'BetaList',
  startupsRip: 'Startups.rip',
  solidgigs: 'SolidGigs',
  contra: 'Contra',
  foundersDb: 'FoundersDB',
  paperclip: 'Paperclip',
  agentscope: 'AgentScope',
  verdent: 'Verdent.ai',
  headai: 'HeadAI',
  webrobots: 'WebRobots',
  gro: 'Gro.app',
  smtp: 'Email Alerts (SMTP)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook Page',
  firebase: 'Firebase (push)',
};

function ConnectionForm() {
  const [baseUrl, setBaseUrl] = useState(appConfig.baseUrl);
  const [apiKey, setApiKey] = useState(appConfig.apiKey);
  const [saved, setSaved] = useState(false);

  return (
    <Card className="p-5">
      <SectionHeader title="Backend Connection" />
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">Backend URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber transition-colors font-mono-tab"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">API Key</label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            className="w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber transition-colors font-mono-tab"
          />
        </div>
        <AccentButton
          label={saved ? 'Saved' : 'Save & Reconnect'}
          icon={Save}
          onClick={() => {
            appConfig.update({ baseUrl, apiKey });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
            setTimeout(() => window.location.reload(), 400);
          }}
        />
      </div>
    </Card>
  );
}

function ConnectedAccounts() {
  const { data: status, isLoading } = useSocialStatus();
  const connect = useConnectPlatform();
  const disconnect = useDisconnectPlatform();

  if (isLoading) return <LoadingState />;

  const rows: { platform: 'linkedin' | 'facebook'; label: string; color: string; connected: boolean }[] = [
    { platform: 'linkedin', label: 'LinkedIn', color: '#0077B5', connected: !!status?.linkedin?.connected },
    { platform: 'facebook', label: 'Facebook Page', color: '#1877F2', connected: !!status?.facebook?.connected },
  ];

  return (
    <Card className="p-5">
      <SectionHeader title="Connected Accounts" />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.platform} className="flex items-center justify-between py-2 border-b border-border-soft last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: `${r.color}22`, color: r.color }}>
                {r.label[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-text-faint">{r.connected ? 'Connected' : 'Not connected'}</p>
              </div>
            </div>
            <button
              onClick={() => (r.connected ? disconnect.mutate(r.platform) : connect.mutate(r.platform))}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                r.connected ? 'bg-critical-bg text-critical' : 'bg-amber/15 text-amber'
              }`}
            >
              {r.connected ? <Unlink size={12} /> : <Link2 size={12} />}
              {r.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IntegrationGrid() {
  const { data, isLoading } = useIntegrations();
  if (isLoading) return <LoadingState />;
  const items = data || [];
  const connected = items.filter((i) => i.connected).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold">Integrations</h3>
        <span className="font-mono-tab text-sm font-semibold text-amber">
          {connected} / {items.length}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden my-3">
        <div className="h-full bg-amber rounded-full" style={{ width: `${items.length ? (connected / items.length) * 100 : 0}%` }} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((i) => (
          <div key={i.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-soft">
            <span className="text-sm">{META[i.name] || i.name}</span>
            <Badge tone={i.connected ? 'success' : 'muted'}>{i.connected ? 'Connected' : 'Off'}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Backend connection, integrations, and connected accounts.</p>
      </div>
      <ConnectionForm />
      <ConnectedAccounts />
      <IntegrationGrid />
    </div>
  );
}
