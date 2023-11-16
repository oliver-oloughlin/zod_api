/**
 * Sleep for a given number of milliseconds.
 *
 * @param ms - Number of milliseconds.
 */
export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}
