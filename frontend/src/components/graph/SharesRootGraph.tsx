// Composant graphe SHARES_ROOT — wrapper autour de ForceGraph2D
// Responsabilité unique : rendu du graphe, pas de logique métier

// TODO Step 6 : implémenter le rendu ForceGraph2D
// - Nœuds colorés par sourate (group → surahColor)
// - Liens pondérés par weight (épaisseur)
// - Tooltip au survol avec roots_ar
// - Click sur nœud → navigation vers détail verset (Phase 4+)

export default function SharesRootGraph() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <p>🔧 Graphe SHARES_ROOT — en construction (Step 6)</p>
    </div>
  )
}
