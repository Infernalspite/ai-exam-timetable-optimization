// quickselect.js — Randomized Select (QuickSelect) for the Kth smallest/largest,
// with helpers for "top K" and "least loaded" queries. Instrumented.
'use strict';

// Iterative randomized QuickSelect on a copy of `arr`. Returns
// { value, comparisons, pivots } where `value` is the Kth smallest
// (1-indexed) under keyFn. Expected O(n) comparisons.
function randomizedSelect(arr, k, keyFn, rng) {
  const a = arr.slice();
  let lo = 0, hi = a.length - 1;
  let kk = Math.max(1, Math.min(k, a.length));
  let comparisons = 0;
  const pivots = [];
  for (;;) {
    if (lo === hi) return { value: keyFn(a[lo]), comparisons, pivots };
    // THE randomization: uniform random pivot in the current range.
    const pivotIdx = lo + Math.floor(rng() * (hi - lo + 1));
    pivots.push(pivotIdx);
    const pivotVal = keyFn(a[pivotIdx]);
    // 3-way partition: a[lo..lt-1] < v, a[lt..gt] == v, a[gt+1..hi] > v.
    let lt = lo, gt = hi, i = lo;
    while (i <= gt) {
      const kv = keyFn(a[i]);
      comparisons++;
      if (kv < pivotVal) { [a[i], a[lt]] = [a[lt], a[i]]; lt++; i++; }
      else if (kv > pivotVal) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }
      else { i++; }
    }
    if (kk <= lt - lo) {
      hi = lt - 1;
    } else if (kk <= gt - lo + 1) {
      return { value: pivotVal, comparisons, pivots };
    } else {
      kk -= (gt - lo + 1);
      lo = gt + 1;
    }
  }
}

// "Top K most conflict-heavy" — the K largest by keyFn, expected O(n).
// Finds the Kth-largest threshold with one QuickSelect, then one linear scan.
function topK(arr, k, keyFn, rng) {
  if (k >= arr.length) {
    // Full sort is unavoidable when K == n; use the instrumented QuickSort.
    const s = arr.slice();
    const st = randomizedQuickSort(s, keyFn, rng);
    return { items: s, comparisons: st.comparisons, fullSort: true };
  }
  const sel = randomizedSelect(arr, k, (x) => -keyFn(x), rng); // Kth largest
  const threshold = -sel.value;
  const items = [];
  for (const item of arr) {
    if (items.length < k && keyFn(item) >= threshold) items.push(item);
  }
  // Tiny O(K log K) tidy-up so the panel shows them best-first.
  items.sort((x, y) => keyFn(y) - keyFn(x));
  return { items, comparisons: sel.comparisons, fullSort: false };
}

// "K least-loaded slots" — the K smallest by keyFn, same trick.
function bottomK(arr, k, keyFn, rng) {
  if (k >= arr.length) {
    const s = arr.slice().sort((x, y) => keyFn(x) - keyFn(y));
    return { items: s, comparisons: 0, fullSort: true };
  }
  const sel = randomizedSelect(arr, k, keyFn, rng); // Kth smallest
  const threshold = sel.value;
  const items = [];
  for (const item of arr) {
    if (items.length < k && keyFn(item) <= threshold) items.push(item);
  }
  items.sort((x, y) => keyFn(x) - keyFn(y));
  return { items, comparisons: sel.comparisons, fullSort: false };
}
