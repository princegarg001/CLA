import { useQuery } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { SentryHealth, UmamiStats, WeeklyReport } from '../types';

export function useUmamiStats() {
  return useQuery({ queryKey: ['umami', 'stats'], queryFn: () => api.get<UmamiStats>('/umami/stats') });
}

export function useActiveVisitors() {
  return useQuery({
    queryKey: ['umami', 'active'],
    queryFn: () => api.get<{ visitors: number }>('/umami/active'),
    refetchInterval: 30_000,
  });
}

export function useSentryHealth() {
  return useQuery({ queryKey: ['sentry', 'health'], queryFn: () => api.get<SentryHealth>('/sentry/health') });
}

export function useWeeklyReport() {
  return useQuery({ queryKey: ['intelligence', 'weekly-report'], queryFn: () => api.get<WeeklyReport>('/intelligence/weekly-report') });
}
