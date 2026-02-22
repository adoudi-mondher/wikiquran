from pydantic import BaseModel


# ─────────────────────────────────────────────
# TOP ROOTS — Racines les plus structurantes
# ─────────────────────────────────────────────

class RootRank(BaseModel):
    """Une racine classée par nombre de versets."""

    rank:              int
    buckwalter:        str
    arabic:            str
    ayah_count:        int    # Nombre de versets contenant cette racine
    occurrences_count: int    # Nombre total d'occurrences dans le Coran


class TopRootsMeta(BaseModel):
    """Métadonnées pour GET /analytics/top-roots."""

    limit: int


class TopRootsResponse(BaseModel):
    """Réponse complète pour GET /analytics/top-roots."""

    roots: list[RootRank]
    meta:  TopRootsMeta


# ─────────────────────────────────────────────
# MECCAN VS MEDINAN — Comparaison par période
# ─────────────────────────────────────────────

class PeriodRoot(BaseModel):
    """Une racine classée dans un corpus (mecquois ou médinois)."""

    buckwalter:  str
    arabic:      str
    ayah_count:  int           # Nombre de versets dans cette période


class MeccanMedinanMeta(BaseModel):
    """Métadonnées pour GET /analytics/meccan-vs-medinan."""

    limit:         int
    meccan_ayahs:  int         # Nombre total de versets mecquois
    medinan_ayahs: int         # Nombre total de versets médinois


class MeccanMedinanResponse(BaseModel):
    """Réponse complète pour GET /analytics/meccan-vs-medinan."""

    meccan:  list[PeriodRoot]
    medinan: list[PeriodRoot]
    meta:    MeccanMedinanMeta
