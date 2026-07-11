export type AppErrorCode
  = | 'auth_expired'
    | 'permission_denied'
    | 'rate_limited'
    | 'not_found'
    | 'validation_failed'
    | 'network_unavailable'
    | 'server_unavailable'
    | 'cloud_write_failed'
    | 'unknown'

interface AppErrorOptions {
  status?: number
  retryable?: boolean
  retryAt?: string
  cause?: unknown
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status?: number
  readonly retryable: boolean
  readonly retryAt?: string

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.status = options.status
    this.retryable = options.retryable ?? false
    this.retryAt = options.retryAt
  }
}

function getRetryAt(response: Response): string | undefined {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds))
      return new Date(Date.now() + seconds * 1000).toISOString()
    const date = new Date(retryAfter)
    if (!Number.isNaN(date.getTime()))
      return date.toISOString()
  }

  const reset = Number(response.headers.get('x-ratelimit-reset'))
  return Number.isFinite(reset) && reset > 0
    ? new Date(reset * 1000).toISOString()
    : undefined
}

async function readGitHubMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json() as { message?: unknown }
    return typeof data.message === 'string' ? data.message : ''
  }
  catch {
    return ''
  }
}

export async function parseGitHubError(response: Response, context: string): Promise<AppError> {
  const status = response.status
  const detail = await readGitHubMessage(response)
  const suffix = detail ? `：${detail}` : ` (${status})`

  if (status === 401)
    return new AppError('auth_expired', `${context}：GitHub 凭证已失效，请重新登录`, { status })

  if (status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    return new AppError('rate_limited', `${context}：GitHub API 请求次数已达上限`, {
      status,
      retryable: true,
      retryAt: getRetryAt(response),
    })
  }

  if (status === 403)
    return new AppError('permission_denied', `${context}${suffix}`, { status })
  if (status === 404)
    return new AppError('not_found', `${context}${suffix}`, { status })
  if (status === 422)
    return new AppError('validation_failed', `${context}${suffix}`, { status })
  if (status >= 500)
    return new AppError('server_unavailable', `${context}${suffix}`, { status, retryable: true })
  return new AppError('unknown', `${context}${suffix}`, { status })
}

export function normalizeNetworkError(error: unknown, context: string): AppError {
  if (error instanceof AppError)
    return error
  return new AppError('network_unavailable', `${context}：无法连接 GitHub，请检查网络后重试`, {
    retryable: true,
    cause: error,
  })
}

export function isAuthenticationError(error: unknown): error is AppError {
  return error instanceof AppError && error.code === 'auth_expired'
}

export function isRetryableError(error: unknown): error is AppError {
  return error instanceof AppError && error.retryable
}
