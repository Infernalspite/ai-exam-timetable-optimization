// quicksort.js — Randomized QuickSort, instrumented.
// Sorts courses by conflict-degree (descending) using a random pivot.
'use strict';

// Sort `arr` in place by `keyFn` with a random pivot. Returns stats:
// { comparisons, swaps, maxDepth, pivots }.
function randomizedQuickSort(arr, keyFn, rng) {
  const stats = { comparisons: 0, swaps: 0, maxDepth: 0, pivots: [] };
  qs(arr, 0, arr.length - 1, keyFn, rng, stats, 0);
  return stats;
}

function qs(a, lo, hi, keyFn, rng, stats, depth) {
  if (lo >= hi) return;
  if (depth > stats.maxDepth) stats.maxDepth = depth;

  // THE randomization: pivot index drawn uniformly from [lo, hi],
  // then moved to the end for a standard Lomuto pass.
  const pivotIdx = lo + Math.floor(rng() * (hi - lo + 1));
  stats.pivots.push(pivotIdx);
  [a[pivotIdx], a[hi]] = [a[hi], a[pivotIdx]];
  const pivotVal = keyFn(a[hi]);

  // Lomuto partition around that value.
  let i = lo;
  for (let j = lo; j < hi; j++) {
    stats.comparisons++;
    if (keyFn(a[j]) >= pivotVal) { // descending order: bigger first
      [a[i], a[j]] = [a[j], a[i]];
      stats.swaps++;
      i++;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  stats.swaps++;
  const p = i;

  qs(a, lo, p - 1, keyFn, rng, stats, depth + 1);
  qs(a, p + 1, hi, keyFn, rng, stats, depth + 1);
}

// Convenience: return a sorted copy without mutating the input.
function sortByConflictDegree(courses, keyFn, rng) {
  const copy = courses.slice();
  const stats = randomizedQuickSort(copy, keyFn, rng);
  return { sorted: copy, stats };
}

// Deterministic first-element-pivot QuickSort (the textbook "bad" version).
// Used only for the demo contrast: on already-sorted input it degrades to O(n²).
function fixedPivotQuickSort(arr, keyFn) {
  const stats = { comparisons: 0, swaps: 0, maxDepth: 0 };
  const stack = [{ lo: 0, hi: arr.length - 1, d: 0 }];
  while (stack.length) {
    const { lo, hi, d } = stack.pop();
    if (lo >= hi) continue;
    if (d > stats.maxDepth) stats.maxDepth = d;
    const pivotVal = keyFn(arr[lo]);
    let i = lo;
    for (let j = lo + 1; j <= hi; j++) {
      stats.comparisons++;
      if (keyFn(arr[j]) >= pivotVal) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        stats.swaps++;
      }
    }
    [arr[lo], arr[i]] = [arr[i], arr[lo]];
    stats.swaps++;
    stack.push({ lo, hi: i - 1, d: d + 1 }, { lo: i + 1, hi, d: d + 1 });
  }
  return stats;
}
