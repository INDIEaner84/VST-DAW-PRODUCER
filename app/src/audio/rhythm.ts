/** Euclidean rhythm generator (Bjorklund).
 *  Distributes `pulses` hits as evenly as possible across `len` steps,
 *  always anchored on the downbeat. euclid(3,8) -> the tresillo x..x..x. */
export function euclid(pulses: number, len: number): number[] {
  if (len <= 0) return []
  const out = new Array(len).fill(0)
  const p = Math.min(Math.max(0, Math.floor(pulses)), len)
  if (p === 0) return out
  if (p === len) return out.fill(1)

  // Bjorklund's algorithm: repeatedly distribute the remainder into the groups,
  // which produces the canonical Euclidean rhythms (tresillo, cinquillo, ...).
  let groups: number[][] = Array.from({ length: p }, () => [1])
  let remainder: number[][] = Array.from({ length: len - p }, () => [0])

  while (remainder.length > 1) {
    const pairs = Math.min(groups.length, remainder.length)
    const merged: number[][] = []
    for (let i = 0; i < pairs; i++) merged.push([...groups[i], ...remainder[i]])
    const leftoverGroups = groups.slice(pairs)
    const leftoverRemainder = remainder.slice(pairs)
    const leftover = leftoverGroups.length ? leftoverGroups : leftoverRemainder
    groups = merged
    remainder = leftover
  }

  return [...groups, ...remainder].flat()
}

/** Rotate a pattern by `n` steps (positive = later / to the right). */
export function rotate<T>(arr: T[], n: number): T[] {
  const len = arr.length
  if (len === 0) return []
  const k = ((n % len) + len) % len
  return [...arr.slice(len - k), ...arr.slice(0, len - k)]
}
