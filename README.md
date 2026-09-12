# AI-Based Exam Timetable Optimization

A self-contained web application that implements a real exam-timetable scheduler using the
**Randomized Algorithms toolkit from Design and Analysis of Algorithms (Unit V)** —
Miller–Rabin primality testing, Randomized QuickSort, Randomized Select (QuickSelect),
graph coloring, and an AI refinement layer (Genetic Algorithm / Simulated Annealing).

No frameworks. No build step. No dependencies — open `index.html` and press **Run**.

## Collaborator

- **Taarunya Giriraj** — GitHub: [@taarunyeahhh](https://github.com/taarunyeahhh) ·
  [taarunyagiriraj.aids2025@citchennai.net](mailto:taarunyagiriraj.aids2025@citchennai.net)
  (AIDS 2025, Chennai Institute of Technology)

## Why this topic

Exam timetabling is **NP-Hard** (it is graph coloring in disguise): every course is a vertex,
every pair of courses sharing a student is an edge, and no two adjacent courses may sit in the
same exam slot ("color"). Exact solutions do not scale, so real schedulers combine smart
heuristics with **randomized algorithms** — exactly the Unit V toolkit — to reach a very good
timetable, very fast.

## How the Unit V algorithms are actually used

| Unit V concept | Role in the scheduler | Where in the code |
|---|---|---|
| **Randomized Primality Testing (Miller–Rabin)** | Hash tables are sized to primes to minimize collisions; Miller–Rabin verifies candidate sizes with random witnesses (error ≤ 4⁻ᵏ) | `js/primality.js` |
| **Hash tables** | O(1) course-code and student→courses lookups when building the conflict graph; the UI compares collisions for a prime vs a power-of-2 table size | `js/hashtable.js` |
| **Randomized QuickSort** | Sorts courses by conflict-degree (most constrained first). A toggle feeds pre-sorted "re-optimization" input so you can watch a fixed-pivot QuickSort collapse toward O(n²) while the random pivot stays expected O(n log n) | `js/quicksort.js` |
| **Randomized Select (QuickSelect)** | Finds the K most conflict-heavy courses in expected O(n) — without a full sort — for constraint heuristics like "most-constrained-variable first" | `js/quickselect.js` |
| **Graph coloring (problem framing)** | Greedy first-fit coloring on the QuickSort order builds the initial timetable | `js/coloring.js` |
| **AI layer: GA / Simulated Annealing** | Repairs tight instances — unplaced courses, residual conflicts, load balance — using Kempe chain swaps and guided moves; fitness = conflict penalty | `js/scheduler.js` |

Every algorithm is instrumented: the UI shows live comparison counts, witness logs,
collision stats, and a fitness-convergence chart.

## Run it

1. Clone the repo (or download and unzip).
2. Open `index.html` in any modern browser. That's it — everything runs locally.

Optionally serve it (nicer URLs, no file:// quirks):

```bash
python -m http.server 8931
# then visit http://127.0.0.1:8931/index.html
```

## Demo script (matches a 5-minute video)

1. **Run** with defaults (60 courses, 800 students, 12 slots) → all four pipeline stages
   complete; final checks show **0 hard conflicts**.
2. Stage 1 panel: Miller–Rabin witness log + prime (83) vs power-of-2 collision counts
   (10 vs 36) — the "why prime table sizes" moment.
3. Stage 2 panel: comparison counts; then tick **Adversarial input** and re-run — the fixed
   first-element pivot balloons (~4× comparisons) while the randomized pivot barely moves.
4. Stage 3 panel: QuickSelect finds the top-K constrained courses with far fewer comparisons
   than a full sort.
5. Switch the AI refiner to **Simulated Annealing** and re-run — it also converges to
   0 conflicts.
6. End on the **Unit V complexity summary** table.

## Configuration

| Control | Meaning |
|---|---|
| Courses / Students | Synthetic dataset size (seeded, so every run is reproducible) |
| Slots | Number of exam slots ("colors" available for coloring) |
| Seed | Fixed RNG seed → identical datasets, witnesses, and pivots per run |
| Adversarial input | Pre-sorts courses by conflict-degree before the sort stage |
| AI refiner | Genetic Algorithm or Simulated Annealing |

## Project structure

```
index.html        page layout, controls, complexity summary table
styles.css        dark presentation theme
js/rng.js         seeded RNG (mulberry32) — reproducible runs
js/primality.js   Miller–Rabin with BigInt-safe modular arithmetic
js/hashtable.js   chain hash tables; prime vs power-of-2 sizing
js/quicksort.js   randomized QuickSort + fixed-pivot comparator
js/quickselect.js randomized Select; topK / bottomK helpers
js/coloring.js    greedy graph coloring + conflict counters
js/scheduler.js   Genetic Algorithm & Simulated Annealing (Kempe swaps)
js/render.js      all UI rendering (graph SVG, chart, timetable, logs)
js/app.js         dataset generation + four-stage pipeline orchestration
```

## Verified behavior

- Default config converges to **0 hard conflicts, 0 unplaced courses** (~300 ms).
- 300 courses / 3000 students: **0 conflicts in under a second**.
- Miller–Rabin unit-checked through 2³¹−1; QuickSelect output verified against a full sort.
