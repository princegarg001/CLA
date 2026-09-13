import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../core/apiClient';
import type { ApolloSequence, IcpProfile, Lead } from '../types';

export function useApolloSearch(titles?: string[]) {
  return useQuery({
    queryKey: ['apollo', 'search', titles],
    queryFn: () => api.get<Lead[]>('/apollo/search', { titles: titles?.join(',') }),
  });
}

export function usePipelineLeads() {
  return useQuery({ queryKey: ['leads', { source: 'apollo' }], queryFn: () => api.get<Lead[]>('/leads', { source: 'apollo' }) });
}

export function useApolloSequences() {
  return useQuery({ queryKey: ['apollo', 'sequences'], queryFn: () => api.get<ApolloSequence[]>('/apollo/sequences') });
}

export function useIcpProfiles() {
  return useQuery({ queryKey: ['apollo', 'icp'], queryFn: () => api.get<IcpProfile[]>('/apollo/icp') });
}

export function useImportLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidate: Partial<Lead>) => api.post<Lead>('/apollo/import', candidate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useSaveIcp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: Partial<IcpProfile>) => api.post<IcpProfile>('/apollo/icp', profile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apollo', 'icp'] }),
  });
}
