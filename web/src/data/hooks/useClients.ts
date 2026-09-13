import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Client, Invoice, Milestone, Project, Testimonial } from '../types';

export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: () => api.get<Client[]>('/clients') });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: !!id,
  });
}

function invalidateClient(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['clients', id] });
  qc.invalidateQueries({ queryKey: ['clients'], exact: true });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: Partial<Project> }) =>
      api.post<Project>(`/clients/${clientId}/projects`, data),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useToggleTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, projectId, running }: { clientId: string; projectId: string; running: boolean }) =>
      api.post<Project>(`/clients/${clientId}/projects/${projectId}/timer/${running ? 'stop' : 'start'}`),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      projectId,
      title,
      amount,
    }: {
      clientId: string;
      projectId: string;
      title: string;
      amount?: number;
    }) => api.post<Milestone>(`/clients/${clientId}/milestones`, { projectId, title, amount }),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, amount }: { clientId: string; amount: number }) =>
      api.post<Invoice>(`/clients/${clientId}/invoices`, { amount }),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, invoiceId }: { clientId: string; invoiceId: string }) =>
      api.patch<Invoice>(`/clients/${clientId}/invoices/${invoiceId}`, { status: 'paid' }),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useAddTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      quote,
      authorName,
      authorTitle,
    }: {
      clientId: string;
      quote: string;
      authorName?: string;
      authorTitle?: string;
    }) => api.post<Testimonial>(`/clients/${clientId}/testimonials`, { quote, authorName, authorTitle }),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useLogCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, channel, fullContent }: { clientId: string; channel: string; fullContent: string }) =>
      api.post(`/clients/${clientId}/log`, { channel, direction: 'outbound', fullContent }),
    onSuccess: (_d, { clientId }) => invalidateClient(qc, clientId),
  });
}

export function useReengageDraft() {
  return useMutation({
    mutationFn: (clientId: string) => api.post<{ draft: string }>(`/clients/${clientId}/reengage-draft`),
  });
}

export function useRescoreHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.get('/clients/health'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
