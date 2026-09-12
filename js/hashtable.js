// hashtable.js — string-keyed hash table sized to a Miller–Rabin-verified prime.
// The demo shows collision counts with a prime vs a nearby composite size.
'use strict';

// Polynomial rolling hash (djb2-ish), kept tiny and fast.
function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// Chains hash buckets; reports bucket occupancy so the UI can show collisions.
class HashTable {
  constructor(size) {
    this.size = size;
    this.buckets = new Array(size);
    this.count = 0;
    this.inserted = 0;
  }

  set(key, value) {
    const idx = hashCode(key) % this.size;
    this.inserted++;
    if (!this.buckets[idx]) {
      this.buckets[idx] = [];
    } else {
      this.count++; // every insert into an occupied bucket is a "collision"
    }
    // Upsert: replace if the key already lives here.
    const chain = this.buckets[idx];
    for (let i = 0; i < chain.length; i++) {
      if (chain[i][0] === key) { chain[i][1] = value; return; }
    }
    chain.push([key, value]);
  }

  get(key) {
    const idx = hashCode(key) % this.size;
    const chain = this.buckets[idx];
    if (!chain) return undefined;
    for (let i = 0; i < chain.length; i++) {
      if (chain[i][0] === key) return chain[i][1];
    }
    return undefined;
  }

  has(key) { return this.get(key) !== undefined; }

  // Walk every [key, value] pair.
  entries() {
    const out = [];
    for (let i = 0; i < this.size; i++) {
      const chain = this.buckets[i];
      if (chain) for (const pair of chain) out.push(pair);
    }
    return out;
  }
}

// Simple non-prime-sized table with the same hash, for the comparison stat.
class CompositeTable {
  constructor(size) {
    this.size = size;
    this.buckets = new Array(size);
    this.count = 0;
    this.inserted = 0;
  }
  set(key, value) {
    const idx = hashCode(key) % this.size;
    this.inserted++;
    if (!this.buckets[idx]) this.buckets[idx] = [];
    else this.count++;
    const chain = this.buckets[idx];
    for (let i = 0; i < chain.length; i++) {
      if (chain[i][0] === key) { chain[i][1] = value; return; }
    }
    chain.push([key, value]);
  }
}

// Pick the next prime >= n (checked by Miller–Rabin), build the table.
// Also builds a composite-sized twin with the same keys for the demo stat.
function buildPrimeTable(keys, values, rng, nItems, rounds) {
  const target = Math.max(11, Math.ceil(nItems / 0.75)); // load factor <= 0.75
  const primeResult = nextPrime(target, rng, rounds || 6);
  const table = new HashTable(primeResult.candidate);
  for (let i = 0; i < keys.length; i++) table.set(keys[i], values[i]);

  // Composite twin: the classic real-world mistake — a power-of-2 table
  // size. With division-method hashing (weak low bits, like djb2), keys
  // cluster into few buckets; the prime size spreads them.
  let compSize = 16;
  while (compSize * 2 <= target) compSize *= 2;
  const compTable = new CompositeTable(compSize);
  for (let i = 0; i < keys.length; i++) compTable.set(keys[i], values[i]);

  return {
    table,
    primeSize: primeResult.candidate,
    primeLog: primeResult.log,
    primeTried: primeResult.tried,
    compositeSize: compSize,
    compositeCollisions: compTable.count,
    primeCollisions: table.count
  };
}
