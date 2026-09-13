import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Deal, MrrData, RevenueSummary, TrendPoint } from '../types';

export function useMrr() {
  return useQuery({ queryKey: ['revenue', 'trustmrr'], queryFn: () => api.get<MrrData>('/revenue/trustmrr') });
}

export function useRevenueTrend() {
  return useQuery({ queryKey: ['revenue', 'trend'], queryFn: () => api.get<TrendPoint[]>('/revenue/trend') });
}

export function useDeals() {
  return useQuery({ queryKey: ['revenue', 'deals'], queryFn: () => api.get<Deal[]>('/revenue/deals') });
}

export function useRevenueSummary() {
  return useQuery({ queryKey: ['revenue', 'summary'], queryFn: () => api.get<RevenueSummary>('/revenue/summary') });
}

export function useAddDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deal: { title: string; value: number; source?: string }) => api.post<Deal>('/revenue/deals', deal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue'] });
    },
  });
}
