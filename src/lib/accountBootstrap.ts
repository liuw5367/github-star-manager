import type { GistCandidate } from '../api/gist'

export type AccountBootstrapDecision
  = | { kind: 'create' }
    | { kind: 'choose', candidates: GistCandidate[] }
    | { kind: 'load', candidate: GistCandidate }
    | { kind: 'sync', candidate: GistCandidate }

export function decideAccountBootstrap(
  candidates: GistCandidate[],
  hasScopedCache: boolean,
): AccountBootstrapDecision {
  if (candidates.length === 0)
    return { kind: 'create' }
  if (candidates.length > 1)
    return { kind: 'choose', candidates }

  const candidate = candidates[0]
  let initialized = false
  try {
    initialized = JSON.parse(candidate.files['meta.json']).initialized === true
  }
  catch {}

  if (initialized && hasScopedCache)
    return { kind: 'load', candidate }
  return { kind: 'sync', candidate }
}
