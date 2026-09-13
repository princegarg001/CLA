import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { CalendarEntry } from '../types';

export function useCalendarEntries() {
  return useQuery({ queryKey: ['calendar'], queryFn: () => api.get<CalendarEntry[]>('/calendar') });
}

export function useApproveCalendarEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CalendarEntry>(`/calendar/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}

export function usePublishCalendarEntryNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CalendarEntry>(`/calendar/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}

export function useCancelCalendarEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}

export function useFillWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ created: number }>('/calendar/fill-week'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}
