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

  /**
   * @param interval - Fixed interval, guarantees a minimum delay between requests.
   */
  constructor(interval: number) {
    this.interval = interval
    this.previousTimestamp = 0
  }

  async throttle() {
    // Calculate current sleep time in milliseconds
    const now = Date.now()
    const diff = now - this.previousTimestamp
    const sleepMs = this.interval - diff

    // Sleep if time is greater than zero
    if (sleepMs > 0) {
      await sleep(sleepMs)
    }

    // Set new previous timestamp
    this.previousTimestamp = now
  }
}
