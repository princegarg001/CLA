import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import { useDebounced } from '../../core/useDebounced';
import type { MediaItem, SocialLimits, SubredditInfo, ValidationResult, Variants } from '../types';

export function useSocialLimits() {
  return useQuery({ queryKey: ['social', 'limits'], queryFn: () => api.get<SocialLimits>('/social/limits'), staleTime: Infinity });
}

export interface ValidationInput {
  content: string;
  platforms: string[];
  postType: string;
  media: MediaItem[];
  variants: Variants;
}

// The server is the single source of truth for what each platform accepts;
// this just asks it (debounced) on every edit so the UI never disagrees with
// what publishing will actually enforce.
export function useValidation(input: ValidationInput) {
  const debounced = useDebounced(input, 350);
  return useQuery({
    queryKey: ['social', 'validate', debounced],
    queryFn: () => api.post<ValidationResult>('/social/validate', debounced),
    placeholderData: keepPreviousData,
    enabled: debounced.platforms.length > 0,
  });
}

export function uploadMedia(file: File, onProgress?: (fraction: number) => void) {
  return api.uploadWithProgress<MediaItem>('/social/media', 'file', file, onProgress);
}

export function useMediaLibrary(enabled = true) {
  return useQuery({ queryKey: ['social', 'media'], queryFn: () => api.get<MediaItem[]>('/social/media'), enabled });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => api.del(`/social/media/${encodeURIComponent(path)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'media'] }),
  });
}

export function useAiVariants() {
  return useMutation({
    mutationFn: (body: { topic?: string; baseText?: string; platforms: string[]; subreddits?: string[] }) =>
      api.post<{ variants: Variants; ai: boolean }>('/social/ai-variants', body),
  });
}

export function useSubredditInfo(name: string) {
  const clean = name.replace(/^r\//i, '').trim();
  const debounced = useDebounced(clean, 500);
  return useQuery({
    queryKey: ['reddit', 'subreddit', debounced],
    queryFn: () => api.get<SubredditInfo>(`/reddit/subreddit/${encodeURIComponent(debounced)}`),
    enabled: /^[A-Za-z0-9_]{2,21}$/.test(debounced),
    staleTime: 10 * 60_000,
  });
}

export function useBrandVoice() {
  return useQuery({
    queryKey: ['settings', 'brand_voice'],
    queryFn: async () => ((await api.get<Record<string, unknown>>('/settings')).brand_voice as string) || '',
  });
}

export function useSaveBrandVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voice: string) => api.post('/settings', { brand_voice: voice }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'brand_voice'] }),
  });
}
