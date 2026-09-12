// scheduler.js — the AI layer: Genetic Algorithm (with a Simulated Annealing
// toggle). It repairs the greedy coloring: fixes unassigned courses, resolves
// remaining edge conflicts, and evens out slot loads.
'use strict';

// Build a fitness that mirrors the script's "conflict penalty":
//   penalty = 100 * hardConflicts + 50 * unassigned + loadImbalance
// Lower is better; zero hard conflicts is the goal.
function makeFitness(adj, numSlots) {
  return function fitness(slotOf) {
    let conflicts = 0;
    for (let c = 0; c < adj.length; c++) {
      const s = slotOf[c];
      if (s < 0) continue;
      for (const nb of adj[c]) {
        if (nb > c && slotOf[nb] === s) conflicts++;
      }
    }
    let unassigned = 0;
    for (let c = 0; c < slotOf.length; c++) if (slotOf[c] < 0) unassigned++;
    // Load balance: spread courses evenly across slots.
    const loads = new Array(numSlots).fill(0);
    for (const s of slotOf) if (s >= 0) loads[s]++;
    const mean = slotOf.length / numSlots;
    let imbalance = 0;
    for (const l of loads) imbalance += Math.abs(l - mean);
    // Unassigned courses count as conflicts too — they must all get placed.
    return 100 * (conflicts + unassigned) + imbalance * 0.1;
  };
}

// Random restart: every course into a uniformly random slot (unassigned gets
// a real slot so the GA always works with complete assignments).
function randomSolution(nCourses, numSlots, rng) {
  const a = new Array(nCourses);
  for (let i = 0; i < nCourses; i++) a[i] = Math.floor(rng() * numSlots);
  return a;
}

// Crossover: uniform gene crossover with a repair step (reassign any course
// that still clashes with a neighbor, choosing its least-loaded free slot).
function crossover(p1, p2, adj, numSlots, rng) {
  const child = new Array(p1.length);
  for (let i = 0; i < p1.length; i++) child[i] = rng() < 0.5 ? p1[i] : p2[i];
  // Repair pass: for each clashing pair, move one endpoint to a quieter slot.
  for (let c = 0; c < adj.length; c++) {
    for (const nb of adj[c]) {
      if (nb > c && child[c] === child[nb]) {
        const loads = new Array(numSlots).fill(0);
        for (const s of child) if (s >= 0) loads[s]++;
        // Candidate slots that neither endpoint's neighbors occupy.
        const used = new Array(numSlots).fill(false);
        for (const nb2 of adj[c]) used[child[nb2]] = true;
        for (const nb2 of adj[nb]) used[child[nb2]] = true;
        let best = -1, bestLoad = Infinity;
        for (let s = 0; s < numSlots; s++) {
          if (!used[s] && loads[s] < bestLoad) { best = s; bestLoad = loads[s]; }
        }
        if (best >= 0) child[c] = best;
      }
    }
  }
  return child;
}

// Kempe chain swap: the classic graph-coloring local move. Take a conflicted
// course c (slot s1), pick a neighbor's slot s2, and swap s1↔s2 across the
// whole connected bi-colored component containing c. This resolves conflicts
// that single-course moves cannot (neighbors covering every slot).
function kempeSwap(sol, adj, numSlots, rng, c) {
  const s1 = sol[c];
  const nbSlots = adj[c].map((nb) => sol[nb]).filter((s) => s !== s1);
  if (!nbSlots.length) return false;
  const s2 = nbSlots[Math.floor(rng() * nbSlots.length)];
  // Grow the (s1,s2)-colored component containing c.
  const comp = new Set([c]);
  const queue = [c];
  while (queue.length) {
    const v = queue.pop();
    for (const nb of adj[v]) {
      if (!comp.has(nb) && (sol[nb] === s1 || sol[nb] === s2)) {
        comp.add(nb);
        queue.push(nb);
      }
    }
  }
  for (const v of comp) sol[v] = sol[v] === s1 ? s2 : s1;
  return true;
}

// Mutation: with probability p, tweak one course. The tweak is GUIDED:
//   • 40% Kempe chain swap on a conflicted course,
//   • otherwise a move to a slot free of the course's neighbors.
// Falls back to a fully random tweak when nothing is conflicted.
function mutate(sol, adj, numSlots, rng, p) {
  if (rng() > p) return sol;
  const conflicted = [];
  for (let c = 0; c < adj.length; c++) {
    for (const nb of adj[c]) {
      if (sol[nb] === sol[c]) { conflicted.push(c); break; }
    }
  }
  if (conflicted.length) {
    const c = conflicted[Math.floor(rng() * conflicted.length)];
    const roll = rng();
    if (roll < 0.4 && kempeSwap(sol, adj, numSlots, rng, c)) return sol;
    const used = new Array(numSlots).fill(false);
    for (const nb of adj[c]) used[sol[nb]] = true;
    const free = [];
    for (let s = 0; s < numSlots; s++) if (!used[s]) free.push(s);
    if (free.length) sol[c] = free[Math.floor(rng() * free.length)];
    return sol;
  }
  const c = Math.floor(rng() * sol.length);
  sol[c] = Math.floor(rng() * numSlots);
  return sol;
}

// Genetic Algorithm main loop. Returns { best, bestScore, history }.
function geneticAlgorithm(adj, numSlots, rng, opts) {
  const nCourses = adj.length;
  const popSize = opts.popSize || 40;
  const generations = opts.generations || 120;
  const mutationP = opts.mutationP || 0.15;
  const fitness = makeFitness(adj, numSlots);
  const history = [];

  // Population starts from the greedy seed plus random restarts.
  let pop = [opts.seed.slice()];
  while (pop.length < popSize) pop.push(randomSolution(nCourses, numSlots, rng));

  let best = pop[0], bestScore = fitness(pop[0]);
  for (let g = 0; g < generations; g++) {
    // Score everyone.
    const scored = pop.map((s) => ({ s, f: fitness(s) }));
    scored.sort((x, y) => x.f - y.f);
    if (scored[0].f < bestScore) {
      bestScore = scored[0].f;
      best = scored[0].s.slice();
    }
    history.push({ gen: g, best: bestScore, mean: scored.reduce((acc, r) => acc + r.f, 0) / scored.length });
    if (bestScore === 0) break; // perfect timetable found

    // Tournament selection (k=3), elitism keeps the top 2.
    const next = [scored[0].s, scored[1].s];
    while (next.length < popSize) {
      const t1 = scored[Math.floor(rng() * popSize)];
      const t2 = scored[Math.floor(rng() * popSize)];
      const t3 = scored[Math.floor(rng() * popSize)];
      const w = t1.f <= t2.f ? t1 : t2;
      const parent1 = (w.f <= t3.f ? w : t3).s;
      const w2 = t1.f <= t3.f ? t1 : t3;
      const parent2 = (w2.f <= t2.f ? w2 : t2).s;
      let child = crossover(parent1, parent2, adj, numSlots, rng);
      child = mutate(child, adj, numSlots, rng, mutationP);
      next.push(child);
    }
    pop = next;
  }
  return { best, bestScore, history };
}

// Simulated Annealing: iterative single-solution refinement with a cooling
// temperature; accepts worse moves early to escape local optima.
function simulatedAnnealing(adj, numSlots, rng, opts) {
  const nCourses = adj.length;
  const iters = opts.iters || 8000;
  const temp0 = opts.temp0 || 6;
  const fitness = makeFitness(adj, numSlots);
  let cur = opts.seed.slice();
  let curScore = fitness(cur);
  let best = cur.slice(), bestScore = curScore;
  const history = [];
  for (let it = 0; it < iters; it++) {
    const temp = temp0 * (1 - it / iters); // linear cooling
    // Neighbor: mostly GUIDED moves (Kempe swap / free-slot move on a real
    // conflict), occasionally a fully random move for exploration.
    const cand = cur.slice();
    const conflicted = [];
    for (let i = 0; i < nCourses; i++) {
      for (const nb of adj[i]) {
        if (cur[nb] === cur[i]) { conflicted.push(i); break; }
      }
    }
    const roll = rng();
    if (conflicted.length && roll < 0.7) {
      const c = conflicted[Math.floor(rng() * conflicted.length)];
      if (roll < 0.35 && kempeSwap(cand, adj, numSlots, rng, c)) {
        // Kempe swap applied.
      } else {
        const used = new Array(numSlots).fill(false);
        for (const nb of adj[c]) used[cur[nb]] = true;
        const free = [];
        for (let s = 0; s < numSlots; s++) if (!used[s]) free.push(s);
        cand[c] = free.length ? free[Math.floor(rng() * free.length)] : Math.floor(rng() * numSlots);
      }
    } else {
      const c = Math.floor(rng() * nCourses);
      cand[c] = Math.floor(rng() * numSlots);
    }
    const candScore = fitness(cand);
    const delta = candScore - curScore;
    if (delta <= 0 || rng() < Math.exp(-delta / Math.max(temp, 1e-9))) {
      cur = cand;
      curScore = candScore;
      if (candScore < bestScore) { best = cand.slice(); bestScore = candScore; }
    }
    if (it % 40 === 0) history.push({ gen: it, best: bestScore, mean: curScore });
    if (bestScore === 0) break;
  }
  return { best, bestScore, history };
}
