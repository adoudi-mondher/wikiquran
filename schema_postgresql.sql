-- ============================================================
-- WikiQuran — Schéma PostgreSQL 16
-- Rôle : Source de vérité (ACID)
-- Version : 0.1.0
-- ============================================================

-- Extension pour la recherche full-text en arabe
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- TABLE : surah
-- Source : tanzil quran-data.xml
-- ============================================================
CREATE TABLE surah (
    id                  SERIAL          PRIMARY KEY,
    number              SMALLINT        NOT NULL UNIQUE,          -- Numéro ordre Mushaf (1-114)
    name_arabic         VARCHAR(50)     NOT NULL,                 -- Nom en arabe ex: الفاتحة
    name_en               VARCHAR(100),                           -- Nom en anglais ex: The Opening
    name_transliteration  VARCHAR(100),                           -- Translittération ex: Al-Faatiha
    revelation_order    SMALLINT        NOT NULL,                 -- Ordre chronologique de révélation
    type                VARCHAR(10)     NOT NULL                  -- 'meccan' ou 'medinan'
                        CHECK (type IN ('meccan', 'medinan')),
    ayas_count          SMALLINT        NOT NULL,                 -- Nombre de versets
    juz_start           SMALLINT,                                 -- Numéro du Juz de début
    hizb_start          SMALLINT,                                 -- Numéro du Hizb de début
    page_start          SMALLINT,                                 -- Page Mushaf de Médine
    rukus                 SMALLINT,                               -- Nombre de sections de récitation

    created_at          TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE : ayah
-- Source : tanzil quran-uthmani.xml
-- ============================================================
CREATE TABLE ayah (
    id                  SERIAL          PRIMARY KEY,
    surah_id            INTEGER         NOT NULL REFERENCES surah(id) ON DELETE CASCADE,
    number              SMALLINT        NOT NULL,                 -- Numéro du verset dans la sourate
    text_arabic         TEXT            NOT NULL,                 -- Texte arabe complet (Uthmani)
    -- Index composite unique : on ne peut pas avoir deux versets 2:255
    UNIQUE (surah_id, number),

    created_at          TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE : root
-- Source : corpus.quran.com (colonne ROOT:)
-- ============================================================
CREATE TABLE root (
    id                  SERIAL          PRIMARY KEY,
    buckwalter          VARCHAR(10)     NOT NULL UNIQUE,          -- ex: smw  (clé technique)
    arabic              VARCHAR(20)     NOT NULL,                 -- ex: سمو  (affichage)
    occurrences_count   INTEGER         DEFAULT 0,               -- Calculé à l'import

    created_at          TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE : word
-- Source : corpus.quran.com
-- Stockage des mots UNIQUES (pas les occurrences)
-- ============================================================
CREATE TABLE word (
    id                  SERIAL          PRIMARY KEY,
    text_arabic         VARCHAR(100)    NOT NULL UNIQUE,          -- Forme exacte du mot arabe
    root_id             INTEGER         REFERENCES root(id),      -- Nullable : certains mots sans racine
    lemma_buckwalter    VARCHAR(50),                              -- Forme de base (Buckwalter)
    pos                 VARCHAR(10),                              -- Partie du discours (N, V, P, ADJ...)

    created_at          TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- TABLE : word_occurrence
-- Table de jointure word <-> ayah
-- Stocke chaque apparition d'un mot dans un verset
-- ============================================================
CREATE TABLE word_occurrence (
    id                  SERIAL          PRIMARY KEY,
    word_id             INTEGER         NOT NULL REFERENCES word(id),
    ayah_id             INTEGER         NOT NULL REFERENCES ayah(id),
    position            SMALLINT        NOT NULL,                 -- Position du mot dans le verset (1-based)

    -- Un mot ne peut apparaître qu'une fois à une position donnée dans un verset
    UNIQUE (ayah_id, position),

    created_at          TIMESTAMP       DEFAULT NOW()
);


-- ============================================================
-- INDEX — Performance des requêtes analytiques
-- ============================================================

-- Recherche par sourate
CREATE INDEX idx_ayah_surah_id         ON ayah(surah_id);

-- Recherche des occurrences d'un mot
CREATE INDEX idx_occurrence_word_id    ON word_occurrence(word_id);

-- Recherche des mots d'un verset
CREATE INDEX idx_occurrence_ayah_id    ON word_occurrence(ayah_id);

-- Recherche des mots d'une racine
CREATE INDEX idx_word_root_id          ON word(root_id);

-- Full-text search sur le texte arabe
CREATE INDEX idx_ayah_text_trgm        ON ayah USING GIN (text_arabic gin_trgm_ops);

-- Recherche par type de sourate (meccan/medinan)
CREATE INDEX idx_surah_type            ON surah(type);

-- Recherche par ordre de révélation
CREATE INDEX idx_surah_revelation      ON surah(revelation_order);


-- ============================================================
-- VUE ANALYTIQUE — Fréquence des racines par type de sourate
-- Exemple de ce que le graphe pourra exploiter
-- ============================================================
CREATE VIEW v_root_frequency AS
SELECT
    r.id                                AS root_id,
    r.arabic                            AS root_arabic,
    r.buckwalter                        AS root_buckwalter,
    s.type                              AS surah_type,           -- meccan / medinan
    COUNT(DISTINCT wo.ayah_id)          AS ayah_count,           -- Nb versets contenant la racine
    COUNT(wo.id)                        AS total_occurrences     -- Nb total d'occurrences
FROM root r
JOIN word        w   ON w.root_id  = r.id
JOIN word_occurrence wo ON wo.word_id = w.id
JOIN ayah        a   ON a.id       = wo.ayah_id
JOIN surah       s   ON s.id       = a.surah_id
GROUP BY r.id, r.arabic, r.buckwalter, s.type;


-- ============================================================
-- DÉCISIONS D'ARCHITECTURE
-- ============================================================
-- ✅ PostgreSQL = Source de vérité (ACID)
-- ✅ Mots uniques dans `word` + occurrences dans `word_occurrence`
-- ✅ Racines stockées en Buckwalter (clé) + Arabe (affichage)
-- ✅ Morphologie Phase 1 : root + lemma + pos uniquement
-- ✅ Morphologie Phase 2 : table `morpheme` (préfixes/suffixes) à ajouter
-- ✅ Métadonnées Surah complètes dès maintenant (scalabilité)
-- ✅ Neo4j reconstruit entièrement depuis PostgreSQL (pg_id comme pont)
-- ============================================================
