import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { MessageTemplate, OutreachMessage } from '../types';

export interface OutreachStats {
  drafts: number;
  followupsWaiting: number;
  sent: number;
  peopleContacted: number;
  replies: number;
  replyRate: number;
  bounced: number;
  failed: number;
  sentLast24h: number;
  dailyCap: number;
  followupsDue: number;
}

export interface OutreachSettings {
  dailyCap: number;
  minDaysBetweenContacts: number;
  followupDays: number[];
  maxFollowups: number;
  autoSendFollowups: boolean;
  signature: string;
  footer: string;
  postalAddress: string;
}

export interface OutreachThread {
  key: string;
  lead: { id: string; name?: string | null; company?: string | null; email?: string | null; status: string; score: number } | null;
  messages: OutreachMessage[];
  lastActivity?: string | null;
  awaitingYou: boolean;
  hasDraft: boolean;
}

export interface MailStatus {
  smtp: { configured: boolean; from: string | null };
  imap: { configured: boolean; host: string | null };
}

export interface OutreachOverview {
  stats: OutreachStats;
  settings: OutreachSettings;
  mail: MailStatus;
  suppressedCount: number;
  lastSync: string | null;
  threads: OutreachThread[];
}

export interface VerifyResult {
  smtp: { configured: boolean; ok: boolean; error: string | null };
  imap: { configured: boolean; ok: boolean; error: string | null };
}

export function useOutreachOverview() {
  return useQuery({ queryKey: ['outreach', 'overview'], queryFn: () => api.get<OutreachOverview>('/outreach/overview'), refetchInterval: 60000 });
}

export function useMailStatus() {
  return useQuery({ queryKey: ['outreach', 'status'], queryFn: () => api.get<{ mail: MailStatus }>('/outreach/status'), staleTime: 60000 });
}

export function useTemplates() {
  return useQuery({ queryKey: ['outreach', 'templates'], queryFn: () => api.get<MessageTemplate[]>('/outreach/templates') });
}

// Every outreach change can move stats, threads and lead status, so they all refresh together.
function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['outreach'] });
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['recs'] });
    qc.invalidateQueries({ queryKey: ['warroom'] });
  };
}

export function useGenerateDraft() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { leadId: string; tone: string; market: string; channel: string; templateId?: string }) => api.post<OutreachMessage>('/outreach/generate', body),
    onSuccess: refresh,
  });
}

export function useSaveDraft() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { leadId?: string; channel: string; subject?: string; body: string; to?: string }) => api.post<OutreachMessage>('/outreach/messages', body),
    onSuccess: refresh,
  });
}

export function useUpdateMessage() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; subject?: string; body?: string; to?: string; channel?: string }) => api.patch<OutreachMessage>(`/outreach/messages/${id}`, patch),
    onSuccess: refresh,
  });
}

export function useSendMessage() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => api.post<{ message: OutreachMessage; warnings: string[] }>(`/outreach/messages/${id}/send`, { force: !!force }),
    onSuccess: refresh,
  });
}

export function useSendFromLead() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (b: { leadId: string; subject: string; body: string; send: boolean; force?: boolean }) => api.post<{ message: OutreachMessage }>('/outreach/from-lead', b),
    onSuccess: refresh,
  });
}

export function useMarkSent() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.post<OutreachMessage>(`/outreach/messages/${id}/mark-sent`), onSuccess: refresh });
}

export function useRecordReply() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text?: string }) => api.post<OutreachMessage>(`/outreach/messages/${id}/replied`, { text }),
    onSuccess: refresh,
  });
}

export function useDeleteMessage() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.del<{ id: string }>(`/outreach/messages/${id}`), onSuccess: refresh });
}

export function useSyncReplies() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () => api.post<{ skipped?: string; checked?: number; replies?: number; bounces?: number; unsubscribes?: number }>('/outreach/sync'),
    onSuccess: refresh,
  });
}

export function useRunFollowups() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api.post<{ due: number; drafted: number; sent: number }>('/outreach/followups/run'), onSuccess: refresh });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: () => api.post<VerifyResult>('/outreach/email/verify') });
}

export function useSaveOutreachSettings() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (patch: Partial<OutreachSettings>) => api.put<OutreachSettings>('/outreach/settings', patch), onSuccess: refresh });
}

export function useSaveTemplate() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; category?: string; tone?: string; market?: string; body: string }) =>
      id ? api.put<MessageTemplate>(`/outreach/templates/${id}`, body) : api.post<MessageTemplate>('/outreach/templates', body),
    onSuccess: refresh,
  });
}

export function useDeleteTemplate() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.del<{ id: string }>(`/outreach/templates/${id}`), onSuccess: refresh });
}

export function useSuppressed() {
  return useQuery({ queryKey: ['outreach', 'suppressed'], queryFn: () => api.get<string[]>('/outreach/suppressed') });
}

export function useUnsuppress() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (email: string) => api.del<string[]>(`/outreach/suppressed/${encodeURIComponent(email)}`), onSuccess: refresh });
}
