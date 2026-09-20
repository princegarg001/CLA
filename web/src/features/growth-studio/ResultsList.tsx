import { CheckCircle2, XCircle, MinusCircle, ExternalLink } from 'lucide-react';
import type { PublishResult } from '../../data/types';

export const PLATFORM_META: Record<string, { label: string; color: string }> = {
  twitter: { label: 'X / Twitter', color: '#1DA1F2' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  reddit: { label: 'Reddit', color: '#FF4500' },
  facebook: { label: 'Facebook', color: '#1877F2' },
};

// Per-platform outcome of a publish, with a link to the live post when there is one.
export function ResultsList({ results }: { results: PublishResult[] }) {
  if (!results.length) return null;
  return (
    <div className="space-y-1.5">
      {results.map((r, i) => {
        const meta = PLATFORM_META[r.platform] || { label: r.platform, color: '#71828C' };
        const Icon = r.status === 'success' ? CheckCircle2 : r.status === 'skipped' ? MinusCircle : XCircle;
        const tone = r.status === 'success' ? 'text-success' : r.status === 'skipped' ? 'text-warning' : 'text-critical';
        return (
          <div key={`${r.platform}-${i}`} className="flex items-start gap-2 text-xs">
            <Icon size={14} className={`${tone} shrink-0 mt-0.5`} />
            <div className="min-w-0 flex-1">
              <span className="font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-text-muted">
                {' '}
                {r.status === 'success' ? 'posted' : r.status === 'skipped' ? `skipped — ${r.reason || 'not connected'}` : `failed — ${r.error || 'unknown error'}`}
              </span>
              {r.status === 'failed' && r.retriable && <span className="text-text-faint"> · will retry automatically</span>}
            </div>
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline shrink-0">
                View <ExternalLink size={11} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
