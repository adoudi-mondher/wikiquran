// Hook pour charger le détail d'un verset (texte arabe + métadonnées)
// Utilisé par le panneau latéral du graphe au click sur un nœud
// Ne fetch que si surah > 0 et verse > 0 (désactivé par défaut)

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AyahDetail } from '../types/api'

interface UseAyahDetailParams {
  surah: number
  verse: number
}

export function useAyahDetail({ surah, verse }: UseAyahDetailParams) {
  const { data, isLoading, error } = useQuery<AyahDetail>({
    queryKey: ['ayah-detail', surah, verse],
    queryFn: () => apiFetch<AyahDetail>(`/ayah/${surah}/${verse}`),
    // Ne fetch que si les paramètres sont valides
    enabled: surah > 0 && verse > 0,
    // Le texte coranique ne change jamais → cache longue durée
    staleTime: Infinity,
  })

  return { ayah: data ?? null, isLoading, error }
}
