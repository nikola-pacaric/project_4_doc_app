export const REQUEST_TIMEOUT_ERROR_NAME = 'RequestTimeoutError';

export function withRequestTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      const error = new Error('Request timed out');
      error.name = REQUEST_TIMEOUT_ERROR_NAME;
      reject(error);
    }, timeoutMs);

    promise.then(resolve, reject).finally(() => globalThis.clearTimeout(timeout));
  });
}
