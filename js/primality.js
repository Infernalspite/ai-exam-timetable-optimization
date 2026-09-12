// primality.js — Randomized Primality Testing (Miller–Rabin), with a
// round-by-round log so the demo can show the random witnesses doing real work.
'use strict';

// Exact mod-multiply: the fast Number path while a*b fits in 2^53,
// a BigInt path beyond that (keeps the test correct for any 32-bit n).
function mulmod(a, b, m) {
  if (m < 94906265) return (a * b) % m;
  return Number((BigInt(a) * BigInt(b)) % BigInt(m));
}

// Modular exponentiation: (base^exp) % mod without huge intermediates.
// This is what makes Miller–Rabin "polynomial time" — O(log exp) multiplications.
function powerMod(base, exp, mod) {
  let result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = mulmod(result, base, mod);
    base = mulmod(base, base, mod);
    exp >>>= 1; // use >>> to keep exp a 32-bit unsigned value
  }
  return result;
}

// Miller–Rabin for n < 2^31 fits safely in JS numbers with this scheme.
// Returns { isPrime, log: [{ witness, x0, composite }], rounds }.
function millerRabin(n, rng, rounds) {
  rounds = rounds || 8;
  const log = [];
  if (n < 2) return { isPrime: false, log, rounds };
  if (n === 2 || n === 3) return { isPrime: true, log, rounds };

  // Write n-1 as d * 2^s with d odd.
  let d = n - 1, s = 0;
  while ((d & 1) === 0) { d >>= 1; s++; }

  let probablyPrime = true;
  for (let r = 0; r < rounds; r++) {
    // Random witness in [2, n-2].
    const a = 2 + Math.floor(rng() * (n - 3));
    let x = powerMod(a, d, n);
    const x0 = x;
    let composite = false;
    if (x === 1 || x === n - 1) {
      // This witness sees nothing; continue.
    } else {
      let passed = false;
      for (let i = 0; i < s - 1; i++) {
        x = mulmod(x, x, n);
        if (x === n - 1) { passed = true; break; }
      }
      if (!passed) composite = true;
    }
    log.push({ witness: a, x0, composite });
    if (composite) { probablyPrime = false; break; }
  }
  return { isPrime: probablyPrime, log, rounds };
}

// Walk upward from `start` until Miller–Rabin says prime; returns
// { candidate, isPrime, log, rounds, tried }.
function nextPrime(start, rng, rounds) {
  let candidate = Math.max(2, Math.floor(start));
  if (candidate % 2 === 0) candidate++;
  const tried = [];
  for (let i = 0; i < 1000; i++) {
    const res = millerRabin(candidate, rng, rounds);
    tried.push(candidate);
    if (res.isPrime) return { candidate, isPrime: true, log: res.log, rounds: res.rounds, tried };
    candidate += 2;
  }
  return { candidate: null, isPrime: false, log: [], rounds, tried };
}
