// ============================================================
// WikiQuran — Schéma Neo4j 5
// Rôle : Index graphe dérivé (BASE)
// Règle fondamentale : Reconstruit depuis PostgreSQL
//                      pg_id = pont vers la source de vérité
// Version : 0.1.0
// ============================================================


// ============================================================
// CONTRAINTES — Unicité des nœuds (équivalent des PK)
// ============================================================

CREATE CONSTRAINT surah_pg_id   IF NOT EXISTS FOR (s:Surah)  REQUIRE s.pg_id  IS UNIQUE;
CREATE CONSTRAINT ayah_pg_id    IF NOT EXISTS FOR (a:Ayah)   REQUIRE a.pg_id  IS UNIQUE;
CREATE CONSTRAINT word_pg_id    IF NOT EXISTS FOR (w:Word)   REQUIRE w.pg_id  IS UNIQUE;
CREATE CONSTRAINT root_bw       IF NOT EXISTS FOR (r:Root)   REQUIRE r.buckwalter IS UNIQUE;


// ============================================================
// INDEX — Performance des traversées de graphe
// ============================================================

CREATE INDEX idx_surah_number   IF NOT EXISTS FOR (s:Surah)  ON (s.number);
CREATE INDEX idx_ayah_ref       IF NOT EXISTS FOR (a:Ayah)   ON (a.surah_number, a.ayah_number);
CREATE INDEX idx_word_pos       IF NOT EXISTS FOR (w:Word)   ON (w.pos);
CREATE INDEX idx_surah_type     IF NOT EXISTS FOR (s:Surah)  ON (s.type);


// ============================================================
// NŒUDS — Propriétés minimales (données analytiques seulement)
// Le texte complet reste dans PostgreSQL
// ============================================================

// --- Surah ---
// Créé depuis : table surah (PostgreSQL)
// Exemple :
CREATE (:Surah {
    pg_id            : 1,            // FK vers PostgreSQL
    number           : 1,            // Numéro Mushaf
    name_arabic      : "الفاتحة",
    revelation_order : 5,            // Ordre chronologique
    type             : "meccan",     // meccan | medinan
    ayas_count       : 7
});

// --- Ayah ---
// Créé depuis : table ayah (PostgreSQL)
// Exemple :
CREATE (:Ayah {
    pg_id        : 1,        // FK vers PostgreSQL
    surah_number : 1,        // Dénormalisé pour les requêtes graphe rapides
    ayah_number  : 1
});

// --- Word ---
// Créé depuis : table word (PostgreSQL)
// Exemple :
CREATE (:Word {
    pg_id        : 1,        // FK vers PostgreSQL
    text_arabic  : "بِسْمِ",
    pos          : "N"       // Partie du discours
});

// --- Root ---
// Créé depuis : table root (PostgreSQL)
// Exemple :
CREATE (:Root {
    pg_id        : 1,        // FK vers PostgreSQL
    buckwalter   : "smw",    // Clé technique unique
    arabic       : "سمو",   // Affichage
    occurrences  : 2837      // Pré-calculé depuis PostgreSQL
});


// ============================================================
// RELATIONS — Le cœur de la valeur analytique
// ============================================================

// (Surah)-[:HAS_AYAH]->(Ayah)
// Hiérarchie structurelle
MATCH (s:Surah {pg_id: $surah_pg_id}), (a:Ayah {pg_id: $ayah_pg_id})
CREATE (s)-[:HAS_AYAH]->(a);


// (Ayah)-[:CONTAINS {position}]->(Word)
// Composition d'un verset — position du mot dans le verset
MATCH (a:Ayah {pg_id: $ayah_pg_id}), (w:Word {pg_id: $word_pg_id})
CREATE (a)-[:CONTAINS {position: $position}]->(w);


// (Word)-[:DERIVED_FROM]->(Root)
// Lien morphologique — mot vers sa racine
MATCH (w:Word {pg_id: $word_pg_id}), (r:Root {buckwalter: $root_bw})
CREATE (w)-[:DERIVED_FROM]->(r);


// ============================================================
// RELATION ANALYTIQUE CLÉ — SHARES_ROOT
// Calculée à l'import depuis PostgreSQL
// C'est ce qui rend WikiQuran unique
// ============================================================

// (Ayah)-[:SHARES_ROOT {root_buckwalter, root_arabic, count}]->(Ayah)
// Deux versets sont connectés s'ils partagent au moins une racine commune
// `count` = nombre de racines partagées (poids de la relation)
MATCH (a1:Ayah {pg_id: $ayah1_pg_id}), (a2:Ayah {pg_id: $ayah2_pg_id})
CREATE (a1)-[:SHARES_ROOT {
    root_buckwalter : $root_bw,      // Racine partagée
    root_arabic     : $root_ar,      // Pour affichage direct
    count           : $count         // Nb de racines communes (si plusieurs)
}]->(a2);


// ============================================================
// REQUÊTES ANALYTIQUES EXEMPLES
// ============================================================

// --- 1. Versets les plus connectés à Ayat al-Kursi (2:255) ---
MATCH (a1:Ayah {surah_number: 2, ayah_number: 255})
      -[r:SHARES_ROOT]->(a2:Ayah)
RETURN a2.surah_number, a2.ayah_number, r.count AS shared_roots
ORDER BY shared_roots DESC
LIMIT 20;


// --- 2. Racines les plus centrales du graphe ---
MATCH (r:Root)<-[:DERIVED_FROM]-(w:Word)<-[:CONTAINS]-(a:Ayah)
RETURN r.arabic, r.buckwalter, COUNT(DISTINCT a) AS ayah_count
ORDER BY ayah_count DESC
LIMIT 20;


// --- 3. Clusters sémantiques : racines mecquoises vs médinoises ---
MATCH (s:Surah {type: "meccan"})-[:HAS_AYAH]->(a:Ayah)
      -[:CONTAINS]->(w:Word)-[:DERIVED_FROM]->(r:Root)
RETURN r.arabic, COUNT(DISTINCT a) AS meccan_ayahs
ORDER BY meccan_ayahs DESC
LIMIT 30;


// --- 4. Chemin sémantique entre deux versets ---
MATCH path = shortestPath(
    (a1:Ayah {surah_number: 2, ayah_number: 255})-[:SHARES_ROOT*]->
    (a2:Ayah {surah_number: 36, ayah_number: 1})
)
RETURN path;


// ============================================================
// DÉCISIONS D'ARCHITECTURE
// ============================================================
// ✅ Neo4j = Index graphe dérivé (BASE)
// ✅ PostgreSQL = Master, Neo4j reconstruit depuis PG si besoin
// ✅ pg_id présent sur chaque nœud = pont vers PostgreSQL
// ✅ Données minimales sur les nœuds (pas de duplication texte)
// ✅ SHARES_ROOT = relation calculée, le différenciateur analytique
// ✅ Phase 2 : ajouter (:Theme) et (Ayah)-[:HAS_THEME]->(Theme)
// ============================================================
