// Hooks analytiques — données macro pour le dashboard
// Cache permanent — les données coraniques ne changent jamais

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { TopRootsResponse, MeccanMedinanResponse } from '../types/api'

/** Top racines globales (limit = 100, max backend) */
export function useTopRoots(limit = 100) {
  return useQuery<TopRootsResponse>({
    queryKey: ['analytics', 'top-roots', limit],
    queryFn: () => apiFetch<TopRootsResponse>('/analytics/top-roots', { limit }),
    staleTime: Infinity,
  })
}

/** Comparaison mecquois vs médinois */
export function useMeccanMedinan(limit = 20) {
  return useQuery<MeccanMedinanResponse>({
    queryKey: ['analytics', 'meccan-medinan', limit],
    queryFn: () => apiFetch<MeccanMedinanResponse>('/analytics/meccan-vs-medinan', { limit }),
    staleTime: Infinity,
  })
}
