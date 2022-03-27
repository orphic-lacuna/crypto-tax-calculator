/**
 * Sleep function is a helper that provides an awaitable timeout.
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}