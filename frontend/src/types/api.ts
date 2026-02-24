// Types miroir des schemas Pydantic backend
// Synchronisés avec les réponses des endpoints FastAPI

// --- Graphe (endpoints Neo4j) ---

/** Nœud dans le graphe SHARES_ROOT */
export interface GraphNode {
  id: string                // Format "surah:ayah" ex: "2:255"
  surah_number: number
  ayah_number: number
  group: number             // = surah_number → couleur par sourate
}

/** Lien entre deux versets (racines partagées) */
export interface GraphLink {
  source: string            // id du nœud source
  target: string            // id du nœud cible
  weight: number            // nombre de racines partagées
  roots_bw: string[]        // racines en Buckwalter
  roots_ar: string[]        // racines en arabe (affichage tooltip)
}

/** Métadonnées de la réponse graphe */
export interface GraphMeta {
  min_roots: number
  limit: number
  total_links: number
}

/** Réponse complète d'un endpoint graphe */
export interface GraphResponse {
  center: GraphNode
  nodes: GraphNode[]
  links: GraphLink[]
  meta: GraphMeta
}

// --- Texte (endpoints PostgreSQL) ---

/** Sourate — miroir exact du schema Pydantic backend */
export interface Surah {
  id: number
  number: number
  name_arabic: string
  name_en: string
  name_transliteration: string
  revelation_order: number
  type: 'meccan' | 'medinan'
  ayas_count: number
  juz_start: number | null
  hizb_start: number | null
  page_start: number | null
  rukus: number
}

/** Réponse de GET /surahs — objet enveloppant */
export interface SurahListResponse {
  total: number
  surahs: Surah[]
}

/** Verset — réponse de GET /ayah/{surah}/{verse} */
export interface AyahDetail {
  id: number
  surah_number: number
  surah_name_arabic: string
  number: number
  text_arabic: string
}

// --- Analytics ---

/** Racine dans le classement top-roots */
export interface TopRootEntry {
  rank: number
  buckwalter: string
  arabic: string
  ayah_count: number
  occurrences_count: number
}

/** Réponse de GET /analytics/top-roots */
export interface TopRootsResponse {
  roots: TopRootEntry[]
  meta: { limit: number }
}

/** Info racine dans la réponse réseau racine */
export interface RootInfo {
  buckwalter: string
  arabic: string
  occurrences_count: number
  total_ayahs: number
}

/** Réponse de GET /network/root/{bw} — différente de GraphResponse */
export interface RootNetworkResponse {
  root: RootInfo
  nodes: GraphNode[]
  links: GraphLink[]
  meta: {
    sort: string
    max_nodes: number
    min_roots: number
    limit: number
    total_nodes: number
    total_links: number
  }
}