// Client HTTP centralisé — toutes les requêtes passent par ici
// En dev  : VITE_API_URL non défini → proxy Vite /api → http://localhost:8000
// En prod : VITE_API_URL=https://api.quranicdata.org → appel direct

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Fetch typé avec gestion d'erreur centralisée
 * @throws Error avec le message du backend si status !== ok
 */
export async function apiFetch<T>(
  endpoint: string,
  params?: Record<string, string | number>,
): Promise<T> {
  // Construction de l'URL avec query params optionnels
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    // Tente de lire le message d'erreur FastAPI (format {"detail": "..."})
    const error = await response.json().catch(() => null)
    throw new Error(
      error?.detail ?? `Erreur API ${response.status}: ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}
