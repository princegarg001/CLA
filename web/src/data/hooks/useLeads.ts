import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Lead } from '../types';

export function useLeads(filters?: { source?: string; status?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => api.get<Lead[]>('/leads', filters),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Lead> }) => api.patch<Lead>(`/leads/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
