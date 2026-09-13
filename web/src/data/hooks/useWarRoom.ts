import { useQuery } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { Mission, FeedAlert, WarRoomSummary } from '../types';

export function useWarRoom() {
  const missions = useQuery({ queryKey: ['warroom', 'missions'], queryFn: () => api.get<Mission[]>('/warroom/missions') });
  const feed = useQuery({ queryKey: ['warroom', 'feed'], queryFn: () => api.get<FeedAlert[]>('/warroom/feed') });
  const summary = useQuery({ queryKey: ['warroom', 'summary'], queryFn: () => api.get<WarRoomSummary>('/warroom/summary') });

  return {
    missions: missions.data || [],
    feed: feed.data || [],
    summary: summary.data,
    isLoading: missions.isLoading || feed.isLoading || summary.isLoading,
    isError: missions.isError || feed.isError || summary.isError,
    error: (missions.error || feed.error || summary.error) as Error | null,
    refetch: () => {
      missions.refetch();
      feed.refetch();
      summary.refetch();
    },
  };
}
