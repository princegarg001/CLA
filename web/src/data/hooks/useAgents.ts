import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { AgentRun, AgentStatusSummary, HiringSignal, VerdentInsight } from '../types';

export function useAgentStatus() {
  return useQuery({ queryKey: ['agents', 'status'], queryFn: () => api.get<AgentStatusSummary>('/agents/status') });
}

export function useAgentRuns() {
  return useQuery({ queryKey: ['agents', 'runs'], queryFn: () => api.get<AgentRun[]>('/agents/runs') });
}

export function useVerdentInsights() {
  return useQuery({ queryKey: ['agents', 'verdent'], queryFn: () => api.get<VerdentInsight[]>('/agents/verdent/insights') });
}

export function useHeadaiSignals() {
  return useQuery({ queryKey: ['agents', 'headai'], queryFn: () => api.get<HiringSignal[]>('/agents/headai/signals') });
}

export function useTriggerAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agent: string) => api.post(`/agents/${agent}/trigger`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', 'status'] });
      qc.invalidateQueries({ queryKey: ['agents', 'runs'] });
    },
  });
}
