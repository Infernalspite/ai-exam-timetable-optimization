// coloring.js — greedy graph coloring: courses = vertices, shared students = edges,
// exam slots = colors. Runs on the QuickSort order (most constrained first).
'use strict';

// orderIdx: course indices sorted by conflict-degree (descending).
// adj: adjacency lists by course index. numSlots: number of "colors".
// Returns { slotOf, unassigned } where slotOf[i] in [0, numSlots) or -1.
function greedyColor(orderIdx, adj, numSlots) {
  const slotOf = new Array(adj.length).fill(-1);
  let unassigned = 0;
  for (const c of orderIdx) {
    // Mark the slots already used by this course's neighbors.
    const used = new Array(numSlots).fill(false);
    for (const nb of adj[c]) {
      const s = slotOf[nb];
      if (s >= 0) used[s] = true;
    }
    // First-fit: smallest slot index with no conflict.
    let placed = -1;
    for (let s = 0; s < numSlots; s++) {
      if (!used[s]) { placed = s; break; }
    }
    if (placed === -1) {
      // Tight instance: no free color. Keep it unassigned; the AI layer
      // (GA/SA) will fight over it during refinement.
      unassigned++;
    } else {
      slotOf[c] = placed;
    }
  }
  return { slotOf, unassigned };
}

// Count hard conflicts: number of edges whose endpoints share a slot.
function countConflicts(slotOf, adj) {
  let conflicts = 0;
  for (let c = 0; c < adj.length; c++) {
    if (slotOf[c] < 0) continue;
    for (const nb of adj[c]) {
      if (nb > c && slotOf[nb] === slotOf[c]) conflicts++;
    }
  }
  return conflicts;
}

// Count unassigned courses (slot -1).
function countUnassigned(slotOf) {
  let n = 0;
  for (const s of slotOf) if (s < 0) n++;
  return n;
}
