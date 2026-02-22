// Composant graphe SHARES_ROOT — wrapper autour de ForceGraph2D
// Responsabilité unique : rendu visuel du graphe, pas de logique métier
// Reçoit les données en props, ne fait aucun appel API

import { useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useContainerSize } from '../../hooks/useContainerSize'
import { surahColor } from '../../lib/constants'
import type { GraphResponse, GraphNode, GraphLink } from '../../types/api'

// --- Types internes ForceGraph2D ---
// ForceGraph2D mute les objets en ajoutant x, y, vx, vy à runtime
interface FGNode extends GraphNode {
  x?: number
  y?: number
}

interface FGLink extends GraphLink {
  source: FGNode | string
  target: FGNode | string
}

// --- Props du composant ---
interface SharesRootGraphProps {
  data: GraphResponse
  onNodeClick?: (nodeId: string) => void
}

// --- Constantes visuelles ---
const NODE_RADIUS = 5           // Rayon de base des nœuds
const CENTER_RADIUS = 10        // Rayon du nœud central (x2)
const CENTER_BORDER = 2         // Épaisseur bordure nœud central
const LABEL_FONT_SIZE = 3       // Taille police labels (relative au zoom)
const LINK_BASE_WIDTH = 0.5     // Épaisseur de base des liens
const LINK_WEIGHT_SCALE = 0.8   // Multiplicateur poids → épaisseur

export default function SharesRootGraph({ data, onNodeClick }: SharesRootGraphProps) {
  // --- Dimensions responsives ---
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useContainerSize(containerRef)

  // --- Données pour ForceGraph2D ---
  // useMemo évite de recréer l'objet à chaque render
  // ForceGraph2D détecte le changement de référence pour relancer la simulation
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

    // Bordure blanche sur le nœud central pour le distinguer
    if (isCenter) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = CENTER_BORDER
      ctx.stroke()
    }

    // Label "surah:ayah" — visible seulement si assez zoomé
    const fontSize = LABEL_FONT_SIZE + (isCenter ? 2 : 0)
    if (globalScale > 1.5 || isCenter) {
      ctx.font = `${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#e5e7eb'  // gray-200
      ctx.fillText(node.id, node.x, node.y + radius + 2)
    }
  }, [centerId])

  // --- Zone de détection du pointeur pour chaque nœud ---
  // Nécessaire quand on utilise nodeCanvasObject (mode custom)
  const drawNodePointerArea = useCallback((node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x === undefined || node.y === undefined) return

    const isCenter = node.id === centerId
    const radius = isCenter ? CENTER_RADIUS : NODE_RADIUS

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI)
    ctx.fillStyle = color  // Couleur unique attribuée par ForceGraph2D pour le hit-test
    ctx.fill()
  }, [centerId])

  // --- Tooltip au survol des liens ---
  const linkTooltip = useCallback((link: FGLink): string => {
    const roots = (link as GraphLink).roots_ar
    const weight = (link as GraphLink).weight
    return `${roots.join('، ')} (${weight} racine${weight > 1 ? 's' : ''})`
  }, [])

  // --- Épaisseur des liens proportionnelle au poids ---
  const linkWidth = useCallback((link: FGLink): number => {
    return LINK_BASE_WIDTH + (link as GraphLink).weight * LINK_WEIGHT_SCALE
  }, [])

  // --- Couleur des liens (semi-transparente) ---
  const linkColor = useCallback((): string => {
    return 'rgba(255, 255, 255, 0.15)'
  }, [])

  // --- Click sur un nœud ---
  const handleNodeClick = useCallback((node: FGNode) => {
    if (onNodeClick && node.id) {
      onNodeClick(node.id as string)
    }
  }, [onNodeClick])

  // --- Tooltip au survol des nœuds ---
  const nodeTooltip = useCallback((node: FGNode): string => {
    return `Sourate ${node.surah_number} : Verset ${node.ayah_number}`
  }, [])

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
