// Composant graphe SHARES_ROOT — wrapper autour de ForceGraph2D
// Responsabilité unique : rendu visuel du graphe, pas de logique métier
// Reçoit les données en props, ne fait aucun appel API

import { useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useContainerSize } from '../../hooks/useContainerSize'
import { useTheme } from '../../lib/theme/ThemeProvider'
import { t } from '../../lib/i18n'
import { surahColor } from '../../lib/constants'
import type { GraphResponse, GraphNode, GraphLink, Surah } from '../../types/api'

// --- Types internes ForceGraph2D ---
// ForceGraph2D mute les objets en ajoutant x, y, vx, vy à runtime
interface FGNode extends GraphNode {
  x?: number
  y?: number
}

interface FGLink extends Omit<GraphLink, 'source' | 'target'> {
  source: FGNode | string
  target: FGNode | string
}

// --- Props du composant ---
interface SharesRootGraphProps {
  data: GraphResponse
  surahMap: Map<number, Surah>
  onNodeClick?: (nodeId: string) => void
}

// --- Constantes visuelles ---
const NODE_RADIUS = 5           // Rayon de base des nœuds
const CENTER_RADIUS = 10        // Rayon du nœud central (x2)
const CENTER_BORDER = 2         // Épaisseur bordure nœud central
const FONT_SIZE_BASE = 3        // Taille police dans les nœuds normaux
const FONT_SIZE_CENTER = 4.5    // Taille police dans le nœud central
const LINK_BASE_WIDTH = 0.5     // Épaisseur de base des liens
const LINK_WEIGHT_SCALE = 0.8   // Multiplicateur poids → épaisseur

// --- Couleurs Canvas par thème (hors portée de Tailwind) ---
const CANVAS_COLORS = {
  dark: {
    centerBorder: '#ffffff',          // Bordure blanche sur fond sombre
    labelText: '#ffffff',             // Texte blanc dans les cercles colorés
    linkColor: 'rgba(255, 255, 255, 0.15)',  // Liens clairs semi-transparents
  },
  light: {
    centerBorder: '#1f2937',          // Bordure gris foncé sur fond clair
    labelText: '#ffffff',             // Texte blanc — lisible sur cercles colorés
    linkColor: 'rgba(0, 0, 0, 0.15)',        // Liens sombres semi-transparents
  },
} as const

export default function SharesRootGraph({ data, surahMap, onNodeClick }: SharesRootGraphProps) {
  // --- Thème pour les couleurs Canvas ---
  const { theme } = useTheme()
  const colors = CANVAS_COLORS[theme]

  // --- Dimensions responsives ---
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useContainerSize(containerRef)

  // --- Données pour ForceGraph2D ---
  // useMemo évite de recréer l'objet à chaque render
  const graphData = useMemo(() => ({
    nodes: data.nodes,
    links: data.links,
  }), [data.nodes, data.links])

  // ID du nœud central — pour le mettre en valeur visuellement
  const centerId = data.center.id

  // --- Rendu custom des nœuds (Canvas 2D) ---
  const drawNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return

    const isCenter = node.id === centerId
    const radius = isCenter ? CENTER_RADIUS : NODE_RADIUS
    const color = surahColor(node.group)

    // Cercle principal
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    // Bordure sur le nœud central pour le distinguer
    if (isCenter) {
      ctx.strokeStyle = colors.centerBorder
      ctx.lineWidth = CENTER_BORDER
      ctx.stroke()
    }

    // Label centré dans le nœud — visible si assez zoomé ou nœud central
    const fontSize = isCenter ? FONT_SIZE_CENTER : FONT_SIZE_BASE
    if (globalScale > 1.2 || isCenter) {
      const label = node.id
      ctx.font = `bold ${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'  // Centré verticalement dans le cercle
      ctx.fillStyle = colors.labelText
      ctx.fillText(label, node.x, node.y)
    }
  }, [centerId, colors])

  // --- Zone de détection du pointeur pour chaque nœud ---
  const drawNodePointerArea = useCallback((node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x === undefined || node.y === undefined) return

    const isCenter = node.id === centerId
    const radius = isCenter ? CENTER_RADIUS : NODE_RADIUS

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }, [centerId])

  // --- Tooltip enrichi au survol des nœuds ---
  const nodeTooltip = useCallback((node: FGNode): string => {
    const surah = surahMap.get(node.surah_number)
    const surahName = surah?.name_arabic ?? `${t('graph.surahFallback')} ${node.surah_number}`
    return `سورة ${surahName} — الآية ${node.ayah_number}`
  }, [surahMap])

  // --- Tooltip au survol des liens ---
  const linkTooltip = useCallback((link: FGLink): string => {
    const roots = (link as GraphLink).roots_ar
    const weight = (link as GraphLink).weight
    return `${roots.join('، ')} (${weight} ${t('graph.rootCount')})`
  }, [])

  // --- Épaisseur des liens proportionnelle au poids ---
  const linkWidth = useCallback((link: FGLink): number => {
    return LINK_BASE_WIDTH + (link as GraphLink).weight * LINK_WEIGHT_SCALE
  }, [])

  // --- Opacité adaptative selon la densité du graphe ---
  const linkOpacity = useMemo((): number => {
    const count = data.links.length
    if (count > 100) return 0.05
    if (count > 50) return 0.08
    if (count > 20) return 0.15
    return 0.25
  }, [data.links.length])

  // --- Couleur des liens — adaptée au thème + densité ---
  const linkColor = useCallback((): string => {
    return theme === 'dark'
      ? `rgba(255, 255, 255, ${linkOpacity})`
      : `rgba(0, 0, 0, ${linkOpacity})`
  }, [theme, linkOpacity])

  // --- Click sur un nœud ---
  const handleNodeClick = useCallback((node: FGNode) => {
    if (onNodeClick && node.id) {
      onNodeClick(node.id as string)
    }
  }, [onNodeClick])

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && height > 0 && (
        <ForceGraph2D
          width={width}
          height={height}
          graphData={graphData}
          /* --- Nœuds --- */
          nodeId="id"
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodePointerAreaPaint={drawNodePointerArea}
          nodeLabel={nodeTooltip}
          onNodeClick={handleNodeClick}
          /* --- Liens --- */
          linkWidth={linkWidth}
          linkColor={linkColor}
          linkLabel={linkTooltip}
          /* --- Apparence globale --- */
          backgroundColor="transparent"
          /* --- Performance --- */
          warmupTicks={50}
          cooldownTicks={100}
        />
      )}
    </div>
  )
}
