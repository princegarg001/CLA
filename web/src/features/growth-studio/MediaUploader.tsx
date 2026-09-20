import { useRef, useState } from 'react';
import { ImagePlus, X, Film, FolderOpen, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { uploadMedia, useDeleteMedia, useMediaLibrary, useSocialLimits } from '../../data/hooks/useStudio';
import { Modal } from '../../components/Modal';
import { LoadingState, EmptyState } from '../../components/ui';
import type { MediaItem } from '../../data/types';

export function fmtBytes(n?: number): string {
  if (!n) return '';
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function MediaThumb({ item, className = '' }: { item: MediaItem; className?: string }) {
  if (item.type === 'video') {
    return <video src={item.url} className={`object-cover bg-black ${className}`} muted preload="metadata" playsInline />;
  }
  return <img src={item.url} alt={item.name || ''} className={`object-cover ${className}`} loading="lazy" />;
}

function MediaLibraryModal({ onPick, onClose }: { onPick: (m: MediaItem) => void; onClose: () => void }) {
  const { data, isLoading, error } = useMediaLibrary();
  const del = useDeleteMedia();

  return (
    <Modal title="Media library" size="xl" onClose={onClose}>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <p className="text-sm text-critical">{(error as Error).message}</p>
      ) : !data?.length ? (
        <EmptyState text="Nothing uploaded yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.map((m) => (
            <div key={m.path || m.url} className="group relative rounded-xl overflow-hidden border border-border-soft bg-bg-soft">
              <button onClick={() => onPick(m)} className="block w-full text-left">
                <MediaThumb item={m} className="h-28 w-full" />
                <div className="px-2 py-1.5">
                  <p className="text-[11px] truncate">{m.name}</p>
                  <p className="text-[10px] text-text-faint">
                    {m.type} · {fmtBytes(m.size)}
                  </p>
                </div>
              </button>
              <button
                onClick={() => m.path && window.confirm(`Delete ${m.name}? Scheduled posts using it will fail.`) && del.mutate(m.path)}
                className="absolute top-1.5 right-1.5 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-critical"
                title="Delete permanently"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

interface Pending {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

// Drag-drop / click / library. Files go straight to hosted storage as they're
// added (with real progress), and the returned items — url, type, size — are
// what the post carries from then on.
export function MediaUploader({ media, onChange }: { media: MediaItem[]; onChange: (m: MediaItem[]) => void }) {
  const { data: limits } = useSocialLimits();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState(false);
  const mediaRef = useRef(media);
  mediaRef.current = media;

  const maxBytes = limits?.uploadMaxBytes ?? 50 * 1048576;
  const allowed = limits ? Object.keys(limits.mediaTypes) : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];

  async function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      if (!allowed.includes(file.type)) {
        setPending((p) => [...p, { id, name: file.name, progress: 0, error: 'Use JPG, PNG, WebP, GIF, MP4 or MOV' }]);
        continue;
      }
      if (file.size > maxBytes) {
        setPending((p) => [...p, { id, name: file.name, progress: 0, error: `Over the ${fmtBytes(maxBytes)} limit (${fmtBytes(file.size)})` }]);
        continue;
      }
      setPending((p) => [...p, { id, name: file.name, progress: 0 }]);
      try {
        const item = await uploadMedia(file, (f) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress: f } : x))));
        onChange([...mediaRef.current, item]);
        setPending((p) => p.filter((x) => x.id !== id));
      } catch (e) {
        setPending((p) => p.map((x) => (x.id === id ? { ...x, error: (e as Error).message } : x)));
      }
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-4 py-4 transition-colors ${dragging ? 'border-amber bg-amber/8' : 'border-border'}`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-9 w-9 rounded-lg bg-amber/12 text-amber flex items-center justify-center">
            <ImagePlus size={17} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <p className="text-sm font-medium">Drop images or video here</p>
            <p className="text-[11px] text-text-faint">JPG · PNG · WebP · GIF · MP4 · MOV — up to {fmtBytes(maxBytes)} each</p>
          </div>
          <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber">
            Choose files
          </button>
          <button onClick={() => setLibrary(true)} className="rounded-lg border border-border-soft px-3 py-1.5 text-xs font-medium hover:border-amber inline-flex items-center gap-1.5">
            <FolderOpen size={13} /> Library
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={allowed.join(',')}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {(media.length > 0 || pending.length > 0) && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {media.map((m, i) => (
            <div key={m.url} className="relative rounded-xl overflow-hidden border border-border-soft bg-bg-soft">
              <MediaThumb item={m} className="h-24 w-full" />
              {m.type === 'video' && (
                <span className="absolute left-1.5 bottom-6 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                  <Film size={10} /> video
                </span>
              )}
              <div className="px-2 py-1">
                <p className="text-[11px] truncate">{m.name}</p>
                <p className="text-[10px] text-text-faint">{fmtBytes(m.size)}</p>
              </div>
              <button
                onClick={() => onChange(media.filter((_, idx) => idx !== i))}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-critical"
                title="Remove from this post"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-border-soft bg-bg-soft p-2.5 flex flex-col justify-between min-h-[110px]">
              <p className="text-[11px] truncate">{p.name}</p>
              {p.error ? (
                <div className="flex items-start gap-1.5 text-critical">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-snug">{p.error}</p>
                  <button onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))} className="ml-auto shrink-0">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-faint mb-1">
                    <Loader2 size={11} className="animate-spin" /> Uploading {Math.round(p.progress * 100)}%
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <div className="h-full bg-amber transition-all" style={{ width: `${p.progress * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {library && (
        <MediaLibraryModal
          onClose={() => setLibrary(false)}
          onPick={(m) => {
            if (!media.some((x) => x.url === m.url)) onChange([...media, m]);
            setLibrary(false);
          }}
        />
      )}
    </div>
  );
}
