import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface border border-border-soft rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <h3 className="font-bold text-sm">{title}</h3>
          <button onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ModalField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-text-muted block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const modalInputClass =
  'w-full rounded-lg bg-bg-soft border border-border-soft px-3 py-2 text-sm outline-none focus:border-amber transition-colors';
