import type { LucideIcon } from 'lucide-react';

export function ComingSoon({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <div className="py-20 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber/12 text-amber flex items-center justify-center mb-5">
        <Icon size={26} />
      </div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-text-muted max-w-md">{description}</p>
      <p className="text-xs text-text-faint mt-6 font-mono-tab">Ported from the mobile app next — not built yet.</p>
    </div>
  );
}
