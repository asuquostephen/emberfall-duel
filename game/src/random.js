// random.js — small seeded RNG (mulberry32) so screenshot scenes and tests
// can replay the exact same deck, and live games can run unseeded.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A deck-shuffle RNG: seeded when a seed is given, Math.random otherwise.
export function makeRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  return mulberry32(seed);
}

export function pick(rng, n) {
  return Math.floor(rng() * n);
}

export function shuffleInPlace(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = pick(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
