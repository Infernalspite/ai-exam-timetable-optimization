// app.js — pipeline orchestration: data → graph → sort → select → color → AI.
'use strict';

/* ------------------------------------------------------------------ */
/* Dataset generation (seeded, reproducible)                          */
/* ------------------------------------------------------------------ */

function generateDataset(nCourses, nStudents, rng, adversarial) {
  const courses = [];
  for (let i = 0; i < nCourses; i++) {
    const year = 1 + (i % 4);
    const dept = Math.floor(i / 20) % 8;
    const code = 'CS' + ((dept * 100) + 101 + (i % 20) + year * 10);
    courses.push({ idx: i, code: code, year: year, students: [], degree: 0 });
  }
  // Adversarial mode is applied AFTER registration below (it pre-sorts by
  // conflict-degree, ascending — the classic worst case for a fixed pivot).

  // Realistic program-group structure: each student belongs to one cohort
  // (a 20-course block = one degree program). Per student:
  //   • 3 of the block's 5 CORE courses (cores share the cohort → a local
  //     5-clique, exactly like real semester data),
  //   • 1 program course from the same block,
  //   • a 25% chance of 1 elective from ANOTHER block (sparse cross edges).
  // Dense locally, sparse globally — schedulable, and degrees vary enough
  // for the QuickSort/QuickSelect panels to be meaningful.
  for (let s = 0; s < nStudents; s++) {
    const nBlocks = Math.ceil(nCourses / 20);
    const block = Math.floor(rng() * nBlocks) * 20;
    const blockEnd = Math.min(block + 20, nCourses);
    const coreEnd = Math.min(block + 5, nCourses);
    const cores = [];
    for (let c = block; c < coreEnd; c++) cores.push(c);
    const picks = shuffled(rng, cores).slice(0, Math.min(3, cores.length));
    if (blockEnd - coreEnd > 0) {
      picks.push(block + 5 + Math.floor(rng() * (blockEnd - coreEnd)));
    }
    if (nBlocks > 1 && rng() < 0.08) {
      let other = block;
      while (other === block) other = Math.floor(rng() * nBlocks) * 20;
      picks.push(other + Math.floor(rng() * Math.min(20, nCourses - other)));
    }
    for (const c of picks) courses[c].students.push('S' + s);
  }
  // NOTE: the adversarial re-ordering happens in runPipeline AFTER the
  // conflict graph exists — it pre-sorts by the real conflict-degree,
  // which is the key Randomized QuickSort actually uses.
  return courses;
}

/* ------------------------------------------------------------------ */
/* Conflict graph (hash tables sized by Miller–Rabin primes)          */
/* ------------------------------------------------------------------ */

function buildConflictGraph(courses, rng, mrRounds) {
  const n = courses.length;
  // course-code → course index (O(1) lookup table)
  const byCode = buildPrimeTable(
    courses.map((c) => c.code),
    courses.map((c) => c.idx),
    rng, n, mrRounds
  );
  // student → [course indices]; students shared by 2+ courses form edges.
  const pairs = [];
  for (const c of courses) {
    for (const stu of c.students) pairs.push([stu, c.idx]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  const stuKeys = [];
  const stuVals = [];
  for (const p of pairs) {
    if (stuKeys.length && stuKeys[stuKeys.length - 1] === p[0]) {
      stuVals[stuVals.length - 1].push(p[1]);
    } else {
      stuKeys.push(p[0]);
      stuVals.push([p[1]]);
    }
  }
  const studentTable = buildPrimeTable(stuKeys, stuVals, rng, stuKeys.length, mrRounds);

  // Adjacency lists: edge (a,b) iff some student takes both a and b.
  const adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  let edges = 0;
  for (const stu of stuKeys) {
    const list = studentTable.table.get(stu);
    if (!list || list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a !== b && adj[a].indexOf(b) < 0) {
          adj[a].push(b);
          adj[b].push(a);
          edges++;
        }
      }
    }
  }
  const degree = new Array(n).fill(0);
  for (let c = 0; c < n; c++) degree[c] = adj[c].length;
  courses.forEach((c) => { c.degree = degree[c.idx]; });
  return { adj: adj, edgeCount: edges, studentTable: studentTable, byCode: byCode };
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                           */
/* ------------------------------------------------------------------ */

function tick() { return new Promise((r) => setTimeout(r, 30)); }

// Shared setup for both pages: dataset + graph + sort + select measurements.
function runAlgorithmsPipeline(rng, adversarial) {
  const nCourses = +document.getElementById('inCourses').value;
  const nStudents = +document.getElementById('inStudents').value;
  const courses = generateDataset(nCourses, nStudents, rng, false);
  const graph = buildConflictGraph(courses, rng, 6);
  const degKey = (c) => c.degree;
  if (adversarial) {
    courses.sort((a, b) => a.degree - b.degree || (a.code < b.code ? -1 : 1));
  }
  const qsResult = sortByConflictDegree(courses, degKey, rng);
  const fixed = fixedPivotQuickSort(courses.slice(), degKey);
  const K = Math.max(1, Math.min(10, Math.floor(nCourses / 6)));
  const top = topK(courses, K, degKey, rng);
  return { courses, graph, qsResult, fixed, K, top, nCourses };
}

// Algorithms page: measurements + logs + graph, no AI stage.
async function runAlgorithmsDemo() {
  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  try {
    const seed = +document.getElementById('inSeed').value;
    const adversarial = document.getElementById('inAdversarial').checked;
    const rng = makeRng(seed);
    const t = runAlgorithmsPipeline(rng, adversarial);
    renderMRPanel(t.graph.byCode);
    renderQSPanel(t.qsResult.sorted, t.qsResult.stats, t.fixed, adversarial);
    renderQSelPanel(t.top, t.K, t.nCourses);
    renderGraph(document.getElementById('graphSvg'), t.courses, t.graph.adj, null, t.top.items.map((c) => c.idx));
    document.getElementById('graphCaption').textContent =
      'Top-' + t.K + ' most constrained courses · ' + t.graph.edgeCount + ' conflict edges · edge labels = shared students';
  } catch (e) {
    console.error(e);
  }
  btn.disabled = false;
}

async function runPipeline() {
  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  try {
    const nCourses = +document.getElementById('inCourses').value;
    const nStudents = +document.getElementById('inStudents').value;
    const numSlots = +document.getElementById('inSlots').value;
    const seed = +document.getElementById('inSeed').value;
    const advEl = document.getElementById('inAdversarial');
    const adversarial = !!(advEl && advEl.checked);
    const refiner = document.getElementById('inRefiner').value;
    document.getElementById('refinerName').textContent =
      refiner === 'ga' ? 'Genetic Algorithm' : 'Simulated Annealing';

    for (let i = 1; i <= 4; i++) setStage(i, null);

    const rng = makeRng(seed);
    const t0 = performance.now();

    // Stage 1 — prime-sized hash tables + conflict graph.
    setStage(1, 'active');
    await tick();
    const courses = generateDataset(nCourses, nStudents, rng, adversarial);
    const graph = buildConflictGraph(courses, rng, 6);
    const pt = graph.byCode;
    document.getElementById('m1').textContent =
      'prime size ' + pt.primeSize + ' · ' + pt.primeCollisions +
      ' collisions (composite: ' + pt.compositeCollisions + ')';
    setStage(1, 'done');

    // Stage 2 — Randomized QuickSort by conflict-degree.
    setStage(2, 'active');
    await tick();
    const degKey = (c) => c.degree;
    // Adversarial mode: input arrives PRE-SORTED ASCENDING BY DEGREE —
    // exactly what a re-optimization pass sees. A fixed first-element
    // pivot collapses toward O(n²) here; the random pivot does not care.
    if (adversarial) {
      courses.sort((a, b) => a.degree - b.degree || (a.code < b.code ? -1 : 1));
    }
    const qsResult = sortByConflictDegree(courses, degKey, rng);
    const fixed = fixedPivotQuickSort(courses.slice(), degKey);
    document.getElementById('m2').textContent =
      qsResult.stats.comparisons + ' comparisons (fixed-pivot: ' + fixed.comparisons + ')';
    setStage(2, 'done');

    // Stage 3 — QuickSelect: top-K most constrained courses.
    setStage(3, 'active');
    await tick();
    const K = Math.max(1, Math.min(10, Math.floor(nCourses / 6)));
    const top = topK(courses, K, degKey, rng);
    document.getElementById('m3').textContent =
      'top-' + K + ' in ' + top.comparisons + ' comparisons';
    setStage(3, 'done');

    // Stage 4 — greedy coloring seed, then GA / SA refinement.
    setStage(4, 'active');
    await tick();
    const colored = greedyColor(qsResult.sorted.map((c) => c.idx), graph.adj, numSlots);
    const seedSolution = colored.slotOf.map((s) => (s < 0 ? Math.floor(rng() * numSlots) : s));
    const aiResult = refiner === 'ga'
      ? geneticAlgorithm(graph.adj, numSlots, rng, {
          seed: seedSolution, popSize: 60, generations: 200, mutationP: 0.35
        })
      : simulatedAnnealing(graph.adj, numSlots, rng, {
          seed: seedSolution, iters: 20000, temp0: 8
        });
    const slotOfFinal = aiResult.best;
    const conflictsFinal = countConflicts(slotOfFinal, graph.adj);
    document.getElementById('m4').textContent =
      'conflicts ' + conflictsFinal + ' · penalty ' + aiResult.bestScore.toFixed(1);
    setStage(4, 'done');

    // Render every panel.
    renderMRPanel(pt);
    renderQSPanel(qsResult.sorted, qsResult.stats, fixed, adversarial);
    renderQSelPanel(top, K, nCourses);
    const graphSvg = document.getElementById('graphSvg');
    if (graphSvg) {
      renderGraph(graphSvg, courses, graph.adj, slotOfFinal, top.items.map((c) => c.idx));
      const cap = document.getElementById('graphCaption');
      if (cap) {
        cap.textContent = 'Top-' + K + ' most constrained courses · ' + graph.edgeCount +
          ' conflict edges · node color = assigned slot (graph coloring)';
      }
    }
    renderChart(document.getElementById('convChart'), aiResult.history);
    renderTimetable(document.getElementById('timetable'), courses, slotOfFinal, numSlots);
    renderFinalChecks(conflictsFinal, slotOfFinal, numSlots);
    renderAIStats(aiResult, conflictsFinal, colored.unassigned);

    const aiLog = document.getElementById('aiLog');
    if (aiLog) {
      const totalMs = (performance.now() - t0).toFixed(1);
      aiLog.innerHTML =
        '&gt; pipeline complete in ' + totalMs + ' ms' +
        '<br>&gt; greedy left ' + colored.unassigned + ' course(s) unplaced; AI layer resolved them';
    }
  } catch (e) {
    console.error(e);
  }
  btn.disabled = false;
}

const btnRun = document.getElementById('btnRun');
if (btnRun) btnRun.addEventListener('click', () => {
  if (document.getElementById('stage1')) runPipeline();
  else runAlgorithmsDemo();
});
window.addEventListener('load', () => {
  if (document.getElementById('stage1')) runPipeline();
  else if (document.getElementById('graphSvg') && document.getElementById('mrLog')) runAlgorithmsDemo();
});
