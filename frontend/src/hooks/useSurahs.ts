// Hook TanStack Query — charge la liste des 114 sourates au démarrage
// Fournit une Map<number, Surah> pour lookup rapide par numéro

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiFetch } from '../api/client'
import type { Surah, SurahListResponse } from '../types/api'

/**
 * Charge les 114 sourates et retourne :
 * - surahs : liste ordonnée (pour les selects)
 * - surahMap : Map<number, Surah> (pour lookup par numéro)
 *
 * Les données sont chargées une seule fois et cachées indéfiniment
 * (les sourates ne changent jamais)
 */
export function useSurahs() {
  const { data: surahs, isLoading, error } = useQuery({
    queryKey: ['surahs'],
    queryFn: async () => {
      const response = await apiFetch<SurahListResponse>('/surahs')
      return response.surahs
    },
    // Cache permanent — les sourates ne changent jamais
    staleTime: Infinity,
    gcTime: Infinity,
  })

  // Map de lookup par numéro — recalculé uniquement si surahs change
  const surahMap = useMemo(() => {
    const map = new Map<number, Surah>()
    if (surahs) {
      surahs.forEach((s) => map.set(s.number, s))
    }
    return map
  }, [surahs])

  return {
    surahs: surahs ?? [],
    surahMap,
    isLoading,
    error,
  }
}