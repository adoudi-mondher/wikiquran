// Hooks TanStack Query — encapsulent les appels API graphe
// Les composants n'appellent jamais fetch directement

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { GraphResponse } from '../types/api'

/** Paramètres pour le sous-graphe d'un verset */
interface AyahNetworkParams {
  surah: number
  verse: number
  minRoots?: number      // défaut 2 (backend)
  limit?: number         // défaut 50 (backend)
}

/** Paramètres pour le sous-graphe d'une racine */
interface RootNetworkParams {
  buckwalter: string
  sort?: 'mushaf' | 'connected'
  maxNodes?: number
  minRoots?: number
  limit?: number
}

/**
 * Sous-graphe SHARES_ROOT autour d'un verset
 * Endpoint : GET /network/ayah/{surah}/{verse}
 */
export function useAyahNetwork({ surah, verse, minRoots, limit }: AyahNetworkParams) {
  return useQuery({
    // Clé de cache unique — TanStack refetch si les params changent
    queryKey: ['network', 'ayah', surah, verse, minRoots, limit],
    queryFn: () =>
      apiFetch<GraphResponse>(`/network/ayah/${surah}/${verse}`, {
        ...(minRoots !== undefined && { min_roots: minRoots }),
        ...(limit !== undefined && { limit }),
      }),
    // Pas de fetch tant que surah/verse ne sont pas définis
    enabled: surah > 0 && verse > 0,
  })
}

/**
 * Sous-graphe des versets partageant une racine
 * Endpoint : GET /network/root/{buckwalter}
 */
export function useRootNetwork({ buckwalter, sort, maxNodes, minRoots, limit }: RootNetworkParams) {
  return useQuery({
    queryKey: ['network', 'root', buckwalter, sort, maxNodes, minRoots, limit],
    queryFn: () =>
      apiFetch<GraphResponse>(`/network/root/${buckwalter}`, {
        ...(sort && { sort }),
        ...(maxNodes !== undefined && { max_nodes: maxNodes }),
        ...(minRoots !== undefined && { min_roots: minRoots }),
        ...(limit !== undefined && { limit }),
      }),
    enabled: buckwalter.length > 0,
  })
}
