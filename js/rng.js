// rng.js — seeded deterministic RNG (mulberry32).
// A fixed seed makes every demo run reproducible: same data, same witnesses,
// same pivots — so the recorded video matches the recorded numbers.
'use strict';

function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random integer in [min, max] inclusive, given an rng() returning [0,1).
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Fisher–Yates shuffle (not part of the graded algorithms; used only to
// build realistic registration data and to scramble the "adversarial" demo).
function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
