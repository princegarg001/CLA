import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { CalendarEntry, MediaItem, Variants } from '../types';

export interface EntryInput {
  content: string;
  platforms: string[];
  postType: string;
  scheduledFor?: string;
  timezone?: string;
  media: MediaItem[];
  variants: Variants;
  status?: 'draft' | 'scheduled';
  publishNow?: boolean;
}

const KEY = ['calendar'];

export function useCalendarEntries() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<CalendarEntry[]>('/calendar', { hideCancelled: '1' }) });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateEntry() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (input: EntryInput) => api.post<CalendarEntry>('/calendar', input), onSuccess: done });
}

export function useUpdateEntry() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<EntryInput> & { id: string }) => api.patch<CalendarEntry>(`/calendar/${id}`, input),
    onSuccess: done,
  });
}

export function useApproveCalendarEntry() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.post<CalendarEntry>(`/calendar/${id}/approve`), onSuccess: done });
}

// Publish now and retry are the same server action: platforms that already
// succeeded are skipped, so it only ever sends what's outstanding.
export function usePublishCalendarEntryNow() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.post<CalendarEntry>(`/calendar/${id}/publish`), onSuccess: done });
}

export function useDuplicateEntry() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.post<CalendarEntry>(`/calendar/${id}/duplicate`), onSuccess: done });
}

export function useDeleteEntry() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) => api.del(`/calendar/${id}${permanent ? '?permanent=true' : ''}`),
    onSuccess: done,
  });
}

export function useFillWeek() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: () => api.post<{ created: number; aiAvailable: boolean }>('/calendar/fill-week'),
    onSuccess: done,
  });
}
