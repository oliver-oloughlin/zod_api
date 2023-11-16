import { Throttle } from "../types.ts"
import { sleep } from "../utils/sleep.ts"

/**
 * A fixed minimum delay between requests.
 *
 * Ignores time spent completing requests.
 */
export class FixedThrottle implements Throttle {
  private interval: number
  private previousTimestamp: number
  private waiting: number

  /**
   * @param interval - Fixed interval in milliseconds, guarantees a minimum delay between requests.
   */
  constructor(interval: number) {
    this.interval = interval
    this.previousTimestamp = 0
    this.waiting = 0
  }

  async throttle() {
    // Calculate current sleep time in milliseconds
    const now = Date.now()
    const diff = now - this.previousTimestamp
    this.previousTimestamp = now
    const sleepMs = this.interval * (1 + this.waiting) - diff

    // Sleep if time is greater than zero
    if (sleepMs > 0) {
      this.waiting += 1
      await sleep(sleepMs)
      this.waiting -= 1
    }
  }
}
