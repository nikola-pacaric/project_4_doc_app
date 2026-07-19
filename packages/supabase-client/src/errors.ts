interface SupabaseErrorShape {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422]);
const RETRYABLE_POSTGREST_CODES = new Set(['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003']);
const RETRYABLE_SQLSTATES = new Set(['57P01', '57P02', '57P03']);
const NETWORK_MESSAGE =
  /failed to fetch|fetch failed|network request failed|load failed|timed out|timeout|connection (?:was )?(?:reset|closed|lost)|dns|offline|internet connection/i;

/**
 * Identify failures that can recover without changing the caller's request.
 * Authorization, validation, conflict, and constraint failures must never be queued as offline work.
 */
export function isTransientSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as SupabaseErrorShape;
  const numericStatus = Number(candidate.status ?? candidate.statusCode);
  if (Number.isFinite(numericStatus)) {
    if (NON_RETRYABLE_HTTP_STATUSES.has(numericStatus)) return false;
    if (RETRYABLE_HTTP_STATUSES.has(numericStatus)) return true;
  }

  if (typeof candidate.code === 'string') {
    const code = candidate.code.toUpperCase();
    if (
      code === '42501' ||
      code.startsWith('22') ||
      code.startsWith('23') ||
      code.startsWith('28')
    ) {
      return false;
    }
    if (
      code.startsWith('08') ||
      code.startsWith('53') ||
      RETRYABLE_SQLSTATES.has(code) ||
      RETRYABLE_POSTGREST_CODES.has(code)
    ) {
      return true;
    }
  }

  return typeof candidate.message === 'string' && NETWORK_MESSAGE.test(candidate.message);
}
