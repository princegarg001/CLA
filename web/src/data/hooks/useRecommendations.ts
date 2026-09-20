import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Lead } from '../types';

export type RecKind = 'seeking' | 'hiring_contract' | 'hiring_fte';
export type RecChannel = 'email' | 'hn_reply' | 'linkedin' | 'apply';

// Stored on the lead as raw.rec by the recommendation engine.
export interface RecInfo {
  key: string;
  date: string;
  score100: number;
  kind: RecKind;
  reasons: string[];
  why: string;
  draft: string;
  draftByAi: boolean;
  fit: 'strong' | 'maybe' | null;
  url: string;
  postedAt?: string;
  budget?: string | null;
  location?: string | null;
  twitter?: string | null;
  channel: RecChannel;
  action: string;
  linkedinSearchUrl?: string | null;
  dismissed?: boolean;
  dismissReason?: string;
}

export interface RecItem {
  leadId: string;
  kind: 'new' | 'followup';
  rank?: number;
  reason?: string;
  lead: Lead;
}

export interface SourceReport {
  ok: boolean;
  fetched: number;
  error?: string;
}

export interface RecPlan {
  date: string;
  generated: boolean;
  generatedAt?: string;
  batches?: number;
  items: RecItem[];
  followups: RecItem[];
  stats: {
    fetched: number;
    skippedKnown: number;
    qualified: number;
    picked: number;
    rejectedByAi?: number;
    rejected?: { company?: string; title?: string; why?: string; url?: string }[];
    aiWritten: number;
    sources: Record<string, SourceReport>;
  } | null;
}

export interface Icp {
  keywords: string[];
  exclude: string[];
  minScore: number;
  count: number;
}

export interface SourceStat {
  total: number;
  acted: number;
  positive: number;
  dismissed: number;
  positiveRate: number | null;
  weight: number;
}

export const recOf = (lead: Lead): RecInfo | undefined => (lead.raw as { rec?: RecInfo } | undefined)?.rec;

export function useTodayRecs() {
  return useQuery({ queryKey: ['recs', 'today'], queryFn: () => api.get<RecPlan>('/recommendations') });
}

// Fetching every source and drafting messages takes up to a minute — the UI says so.
export function useRefreshRecs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RecPlan>('/recommendations/refresh'),
    onSuccess: (plan) => {
      qc.setQueryData(['recs', 'today'], plan);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDismissRec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason: string }) => api.post<Lead>(`/recommendations/${leadId}/dismiss`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recs'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useSetLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) => api.patch<Lead>(`/leads/${leadId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recs'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['warroom'] });
    },
  });
}

export function useIcp() {
  return useQuery({ queryKey: ['recs', 'icp'], queryFn: () => api.get<Icp>('/recommendations/icp') });
}

export function useSaveIcp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (icp: Partial<Icp>) => api.put<Icp>('/recommendations/icp', icp),
    onSuccess: (icp) => qc.setQueryData(['recs', 'icp'], icp),
  });
}

export function useSourceStats() {
  return useQuery({ queryKey: ['recs', 'sources'], queryFn: () => api.get<Record<string, SourceStat>>('/recommendations/sources') });
}
