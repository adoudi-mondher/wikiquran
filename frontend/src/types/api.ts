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

/** Verset */
export interface Ayah {
  surah_number: number
  ayah_number: number
  text_uthmani: string
}

// --- Analytics ---

/** Racine dans le classement top-roots */
export interface TopRoot {
  buckwalter: string
  arabic: string
  verse_count: number
  occurrence_count: number
}

/** Comparaison mecquois vs médinois */
export interface MeccanMedinan {
  meccan_top: TopRoot[]
  medinan_top: TopRoot[]
}