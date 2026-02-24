// Hook pour charger la liste des racines (autocomplete dans le mode racine)
// Utilise /analytics/top-roots avec limit élevé pour tout récupérer
// Cache permanent — les racines ne changent jamais

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { TopRootsResponse, TopRootEntry } from '../types/api'

/** Top 100 racines — le backend plafonne à 100, suffisant pour l'exploration */
const TOP_ROOTS_LIMIT = 100

export function useRoots() {
  const { data, isLoading, error } = useQuery<TopRootsResponse>({
    queryKey: ['roots', 'top'],
    queryFn: () => apiFetch<TopRootsResponse>('/analytics/top-roots', {
      limit: TOP_ROOTS_LIMIT,
    }),
    // Les racines coraniques ne changent jamais → cache permanent
    staleTime: Infinity,
  })

  const roots: TopRootEntry[] = data?.roots ?? []

  return { roots, isLoading, error }
}