import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { RedditKarma, RedditPost } from '../types';

export function useRedditOpportunities() {
  return useQuery({ queryKey: ['reddit', 'opportunities'], queryFn: () => api.get<RedditPost[]>('/reddit/opportunities') });
}

export function useRedditKarma() {
  return useQuery({ queryKey: ['reddit', 'status'], queryFn: () => api.get<RedditKarma>('/reddit/status') });
}

export function useDraftRedditReply() {
  return useMutation({
    mutationFn: (post: RedditPost) => api.post<{ draft: string }>('/reddit/draft-reply', { post }),
  });
}

export function useSendRedditReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ post, text }: { post: RedditPost; text: string }) =>
      api.post('/reddit/reply', { parentFullname: post.fullname, text, postId: post.id, subreddit: post.subreddit, postTitle: post.title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reddit'] }),
  });
}
