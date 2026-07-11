import type { GistCandidate } from '../api/gist'
import type { User } from '../types'
import type { AccountSnapshot, StorageLike } from './accountCache.ts'
import { loadCachedAccount } from './accountCache.ts'

export type AccountBootstrapDecision
  = | { kind: 'create' }
    | { kind: 'choose', candidates: GistCandidate[] }
    | { kind: 'load', candidate: GistCandidate }
    | { kind: 'sync', candidate: GistCandidate }

export type CredentialStatus = 'unverified' | 'valid' | 'reauth_required'

export function shouldRestoreCachedSession(status: CredentialStatus): boolean {
  return status !== 'reauth_required'
}

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

export function restoreCachedAccount(
  storage: StorageLike,
  gistId: string,
  apply: (account: { snapshot: AccountSnapshot, user: User }) => void,
): boolean {
  const account = loadCachedAccount(storage, gistId)
  if (!account)
    return false
  apply(account)
  return true
}
