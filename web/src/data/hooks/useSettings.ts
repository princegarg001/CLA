import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';

export interface IntegrationStatus {
  name: string;
  connected: boolean;
}

export function useIntegrations() {
  return useQuery({ queryKey: ['settings', 'integrations'], queryFn: () => api.get<IntegrationStatus[]>('/settings/integrations') });
}

export interface SocialPlatformStatus {
  connected: boolean;
  appConfigured?: boolean;
  accountName?: string | null;
  expiresAt?: string | null;
  daysLeft?: number | null;
  expired?: boolean;
  monitoredSubs?: string[];
}

export interface SocialStatus {
  linkedin: SocialPlatformStatus;
  facebook: SocialPlatformStatus;
  twitter: { appConfigured: boolean; connected: boolean; features?: Record<string, boolean> };
  reddit: SocialPlatformStatus;
}

export function useSocialStatus() {
  return useQuery({ queryKey: ['social', 'status'], queryFn: () => api.get<SocialStatus>('/social/status') });
}

export function useConnectPlatform() {
  return useMutation({
    mutationFn: async (platform: 'linkedin' | 'facebook') => {
      const { url } = await api.get<{ url: string }>(`/social/${platform}/auth-url`);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  });
}

export function useDisconnectPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform: 'linkedin' | 'facebook') => api.post(`/social/${platform}/disconnect`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'status'] }),
  });
}
