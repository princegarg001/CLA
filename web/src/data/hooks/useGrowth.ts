import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { GumroadStats, InstagramInsights, InstagramMedia, Lead, PublishResult, ScheduledPost, TwitterAnalytics } from '../types';

export function usePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { text: string; imageUrl?: string; platforms: string[] }) =>
      api.post<{ batchId: string; results: PublishResult[] }>('/social/publish', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/social/upload-image', 'image', file),
  });
}

export function useGumroadStats() {
  return useQuery({ queryKey: ['gumroad', 'stats'], queryFn: () => api.get<GumroadStats>('/gumroad/stats') });
}

export function useTwitterAnalytics() {
  return useQuery({ queryKey: ['twitter', 'analytics'], queryFn: () => api.get<TwitterAnalytics>('/twitter/analytics') });
}

export function useTwitterScheduled() {
  return useQuery({ queryKey: ['twitter', 'scheduled'], queryFn: () => api.get<ScheduledPost[]>('/twitter/scheduled') });
}

export function useGenerateThread() {
  return useMutation({
    mutationFn: (topic: string) => api.post<{ topic: string; tweets: string[] }>('/twitter/thread/generate', { topic }),
  });
}

export function useBetalistSignups() {
  return useQuery({ queryKey: ['leads', { source: 'betalist' }], queryFn: () => api.get<Lead[]>('/leads', { source: 'betalist' }) });
}

export function useInstagramInsights() {
  return useQuery({ queryKey: ['social', 'instagram', 'insights'], queryFn: () => api.get<InstagramInsights>('/social/instagram/insights') });
}

export function useInstagramMedia() {
  return useQuery({ queryKey: ['social', 'instagram', 'media'], queryFn: () => api.get<InstagramMedia[]>('/social/instagram/media') });
}
