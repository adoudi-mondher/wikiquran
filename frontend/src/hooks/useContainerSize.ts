// Hook réutilisable — observe la taille d'un conteneur HTML en temps réel
// Utilise ResizeObserver (API native) pour détecter les changements de dimensions

import { useState, useEffect, type RefObject } from 'react'

/** Dimensions retournées par le hook */
interface ContainerSize {
  width: number
  height: number
}

/**
 * Observe la taille d'un élément HTML et retourne { width, height } à jour
 * Se met à jour automatiquement au resize de la fenêtre ou du conteneur
 *
 * @param ref — référence vers l'élément HTML à observer
 * @returns { width, height } en pixels (0x0 si l'élément n'existe pas encore)
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { width, height } = useContainerSize(containerRef)
 */
export function useContainerSize(ref: RefObject<HTMLElement | null>): ContainerSize {
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Lecture initiale — évite un flash à 0x0 au premier rendu
    const { clientWidth, clientHeight } = element
    setSize({ width: clientWidth, height: clientHeight })

    // Observer les changements de taille
    const observer = new ResizeObserver((entries) => {
      // On observe un seul élément, donc entries[0] suffit
      const entry = entries[0]
      if (!entry) return

      // contentRect donne les dimensions internes (sans padding/border)
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(element)

    // Nettoyage — déconnecte l'observer au démontage
    return () => observer.disconnect()
  }, [ref])

  return size
}
