import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { MessageTemplate, OutreachMessage } from '../types';

export function useInbox() {
  return useQuery({ queryKey: ['outreach', 'inbox'], queryFn: () => api.get<OutreachMessage[]>('/outreach/inbox') });
}

export function useTemplates() {
  return useQuery({ queryKey: ['outreach', 'templates'], queryFn: () => api.get<MessageTemplate[]>('/outreach/templates') });
}

export function useGenerateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { leadId: string; tone: string; market: string; channel: string }) =>
      api.post<OutreachMessage>('/outreach/generate', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach', 'inbox'] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: string }) =>
      api.patch<OutreachMessage>(`/outreach/messages/${id}`, { status: 'sent', ...(body ? { body } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach', 'inbox'] }),
  });
}
