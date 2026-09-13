import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Lead, RssItem, UpworkJob, UpworkStats } from '../types';

export function useSolidGigs() {
  return useQuery({ queryKey: ['freelance', 'solidgigs'], queryFn: () => api.get<Lead[]>('/freelance/solidgigs') });
}
export function useContra() {
  return useQuery({ queryKey: ['freelance', 'contra'], queryFn: () => api.get<Lead[]>('/freelance/contra') });
}
export function useStartupsRip() {
  return useQuery({ queryKey: ['freelance', 'startupsrip'], queryFn: () => api.get<RssItem[]>('/freelance/startupsrip') });
}

export function useGeneratePitch() {
  return useMutation({
    mutationFn: ({ leadId, platform }: { leadId: string; platform: string }) =>
      api.post<{ pitch: string }>('/freelance/pitch', { leadId, platform }),
  });
}

export function useUpworkJobs() {
  return useQuery({ queryKey: ['upwork', 'jobs'], queryFn: () => api.get<UpworkJob[]>('/upwork/jobs') });
}

export function useUpworkStats() {
  return useQuery({ queryKey: ['upwork', 'stats'], queryFn: () => api.get<UpworkStats>('/upwork/stats') });
}

// PATCH /upwork/jobs/:id takes camelCase keys (status/proposalText/outcomeValue),
// unlike every snake_case resource elsewhere in this app — matches the route as written.
export function useUpdateUpworkJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, outcomeValue }: { id: string; status: string; outcomeValue?: number }) =>
      api.patch<UpworkJob>(`/upwork/jobs/${id}`, { status, outcomeValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upwork', 'jobs'] }),
  });
}

export function useRegenerateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post<{ jobId: string; proposal: string }>('/upwork/proposal', { jobId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upwork', 'jobs'] }),
  });
}
