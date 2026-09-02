/**
 * RETRY MANAGER UTILITY
 * Implements graduated retry strategy:
 * - Attempt 1: 5s
 * - Attempt 2: 15s
 * - Attempt 3: 30s
 * - Subsequent: Exponential Backoff (capped at 60s)
 * - Max retries: 5 (marks as 'failed' once exceeded)
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number; // 5000ms
  secondDelayMs: number;  // 15000ms
  thirdDelayMs: number;   // 30000ms
  maxDelayMs: number;     // 60000ms
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 5000,
  secondDelayMs: 15000,
  thirdDelayMs: 30000,
  maxDelayMs: 60000
};

export class RetryManager {
  /**
   * Calculates the delay in milliseconds before the next retry attempt based on current retry count.
   */
  static getNextDelayMs(retryCount: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    if (retryCount <= 0) return config.initialDelayMs;
    if (retryCount === 1) return config.secondDelayMs;
    if (retryCount === 2) return config.thirdDelayMs;

    // Exponential backoff for attempts > 2: delay = 30s * 1.5^(retryCount - 2) + jitter
    const exp = Math.pow(1.5, retryCount - 2);
    const calculated = config.thirdDelayMs * exp;
    const jitter = Math.floor(Math.random() * 2000);
    return Math.min(calculated + jitter, config.maxDelayMs);
  }

  /**
   * Returns whether a task can be retried further.
   */
  static canRetry(retryCount: number, maxRetries: number = DEFAULT_RETRY_CONFIG.maxRetries): boolean {
    return retryCount < maxRetries;
  }
}
