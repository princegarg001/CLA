import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Search, type LucideIcon } from 'lucide-react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border-soft rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_20px_-12px_rgba(0,0,0,0.5)] ${onClick ? 'cursor-pointer hover:border-border transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <h3 className="text-[15px] font-bold text-text">{title}</h3>
      {action}
    </div>
  );
}

const scoreTone = (score: number) => {
  if (score >= 8) return { bg: 'bg-critical-bg', text: 'text-critical', label: 'Hot' };
  if (score >= 5) return { bg: 'bg-warning-bg', text: 'text-warning', label: 'Warm' };
  return { bg: 'bg-surface-hover', text: 'text-text-muted', label: 'Cold' };
};

export function ScoreBadge({ score }: { score: number }) {
  const t = scoreTone(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.bg} ${t.text}`}>
      {t.label} · {score}/10
    </span>
  );
}

export function Badge({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'critical' | 'muted';
}) {
  const tones: Record<string, string> = {
    info: 'bg-info-bg text-info',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    critical: 'bg-critical-bg text-critical',
    muted: 'bg-surface-hover text-text-muted',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function AccentButton({
  label,
  onClick,
  icon: Icon,
  loading = false,
  variant = 'solid',
  disabled = false,
  type = 'button',
}: {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'solid'
      ? 'bg-amber text-[#221604] hover:bg-amber-light'
      : 'border border-amber text-amber hover:bg-amber/10';
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${styles}`}>
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        Icon && <Icon size={16} />
      )}
      {label}
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, active = false }: { icon: LucideIcon; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-xl transition-colors ${
        active ? 'bg-amber/15 text-amber' : 'bg-white/10 text-text hover:bg-white/15'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp = true,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-lg bg-amber/12 text-amber flex items-center justify-center">
          <Icon size={18} />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendUp ? 'bg-success-bg text-success' : 'bg-critical-bg text-critical'}`}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 font-mono-tab text-[22px] font-bold text-text">{value}</div>
      <div className="text-xs text-text-faint mt-0.5">{label}</div>
    </Card>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto px-1 border-b border-border-soft">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`relative pb-3 pt-1 text-sm whitespace-nowrap font-medium transition-colors ${
            i === active ? 'text-amber font-semibold' : 'text-text-faint hover:text-text-muted'
          }`}
        >
          {t}
          {i === active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-amber rounded-full" />}
        </button>
      ))}
    </div>
  );
}

const AVATAR_COLORS = ['#F5A623', '#00BFA5', '#7C4DFF', '#FF7043', '#66BB6A', '#26C6DA'];

export function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0] || '?').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold shrink-0"
      style={{ width: size, height: size, background: `${color}26`, color, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function SearchInput({
  placeholder,
  onChange,
  dark = false,
}: {
  placeholder: string;
  onChange: (v: string) => void;
  dark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 h-10 ${dark ? 'bg-white/12' : 'bg-surface border border-border-soft'}`}>
      <Search size={16} className={dark ? 'text-white/60' : 'text-text-faint'} />
      <input
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-transparent outline-none text-sm w-full ${dark ? 'text-white placeholder:text-white/50' : 'text-text placeholder:text-text-faint'}`}
      />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="text-center text-sm text-text-faint py-16">{text}</div>;
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="h-6 w-6 rounded-full border-2 border-amber border-t-transparent animate-spin" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-critical mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold text-amber hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
