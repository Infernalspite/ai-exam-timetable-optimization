// render.js — every UI rendering helper (panels, graph, chart, timetable).
'use strict';

const SLOT_COLORS = [
  '#4da3ff', '#43d17c', '#ffb454', '#ff5d73', '#b57bff', '#3dd6c3',
  '#ff9e64', '#7bd88f', '#e0af68', '#61b3ff', '#c792ea', '#89ddff',
  '#f07178', '#a6e3a1', '#f9e2af', '#94e2d5'
];

function stat(label, value) {
  return `<div class="stat">${label}<b>${value}</b></div>`;
}

function setStage(i, state) {
  const el = document.getElementById('stage' + i);
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
}

function renderMRPanel(pt) {
  const primeSize = pt.primeSize;
  const rounds = pt.primeLog;
  const el = document.getElementById('mrStats');
  el.innerHTML =
    stat('Table size (prime)', primeSize) +
    stat('Witnesses (k)', rounds.length) +
    stat('Composites rejected', pt.primeTried.length - 1) +
    stat('Collisions prime vs composite', pt.primeCollisions + ' / ' + pt.compositeCollisions);
  const log = document.getElementById('mrLog');
  log.innerHTML = '';
  const line = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    log.appendChild(d);
  };
  for (const t of pt.primeTried) {
    if (t !== primeSize) {
      line('&gt; candidate <span class="dim">' + t + '</span> → <span class="no">COMPOSITE</span> (witness found)');
    }
  }
  rounds.forEach((r, i) => {
    const tag = r.composite ? '<span class="no">COMPOSITE</span>' : '<span class="ok">passed</span>';
    line('&gt; round ' + (i + 1) + ': witness a=' + r.witness + ', x₀=' + r.x0 + ' → ' + tag);
  });
  line('&gt; <span class="ok">✔ ' + primeSize + ' is PRIME</span> <span class="dim">(error ≤ 4^-' + rounds.length + ')</span>');
}

function renderQSPanel(sorted, stats, fixedStats, adversarial) {
  document.getElementById('qsStats').innerHTML =
    stat('Courses sorted (n)', sorted.length) +
    stat('Randomized comparisons', stats.comparisons) +
    stat('Fixed-pivot comparisons', fixedStats.comparisons) +
    stat('Max recursion depth', stats.maxDepth);
  const rows = sorted.slice(0, 8).map((c, i) =>
    '&gt; #' + (i + 1) + ' <span class="k">' + c.code + '</span> — degree ' + c.degree
  );
  rows.push('&gt; <span class="dim">n=' + sorted.length +
    ', comparisons: randomized=' + stats.comparisons +
    ' vs fixed-pivot=' + fixedStats.comparisons +
    (adversarial ? ' (pre-sorted input — fixed pivot collapses toward O(n²))' : '') + '</span>');
  document.getElementById('qsTrace').innerHTML = rows.join('<br>');
}

function renderQSelPanel(top, k, n) {
  document.getElementById('qselStats').innerHTML =
    stat('K (most constrained)', k) +
    stat('n (all courses)', n) +
    stat('QuickSelect comparisons', top.comparisons) +
    stat('Full sort would cost', '~' + Math.round(n * Math.log2(n)));
  const rows = top.items.slice(0, 8).map((c, i) =>
    '&gt; top-' + (i + 1) + ': <span class="k">' + c.code + '</span> — degree ' + c.degree
  );
  rows.push('&gt; <span class="dim">expected O(n): ' + top.comparisons +
    ' comparisons vs ~' + Math.round(n * Math.log2(n)) + ' for a full sort</span>');
  document.getElementById('qselTrace').innerHTML = rows.join('<br>');
}

function renderGraph(svg, courses, adj, slotOf, topIdx) {
  const W = 900, H = 380, R = 150, cx = W / 2, cy = H / 2;
  const nodes = topIdx.map((idx, i) => ({
    idx: idx,
    x: cx + R * Math.cos((2 * Math.PI * i) / topIdx.length - Math.PI / 2),
    y: cy + R * Math.sin((2 * Math.PI * i) / topIdx.length - Math.PI / 2)
  }));
  const pos = new Map();
  nodes.forEach((n) => pos.set(n.idx, n));
  let edges = '';
  nodes.forEach((n) => {
    adj[n.idx].forEach((nb) => {
      const m = pos.get(nb);
      if (m && nb > n.idx) {
        edges += '<line x1="' + n.x.toFixed(1) + '" y1="' + n.y.toFixed(1) +
          '" x2="' + m.x.toFixed(1) + '" y2="' + m.y.toFixed(1) +
          '" stroke="#2a3c5c" stroke-width="1.5"/>';
        const shared = courses[n.idx].students.filter((s) =>
          courses[nb].students.indexOf(s) >= 0).length;
        edges += '<text x="' + ((n.x + m.x) / 2).toFixed(1) + '" y="' + ((n.y + m.y) / 2 - 4).toFixed(1) +
          '" text-anchor="middle" font-size="9" fill="#5c718c">' + shared + '</text>';
      }
    });
  });
  let dots = '';
  nodes.forEach((n) => {
    const s = slotOf ? slotOf[n.idx] : -1;
    const color = s >= 0 ? SLOT_COLORS[s % SLOT_COLORS.length] : '#555f70';
    dots += '<circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) +
      '" r="16" fill="' + color + '" fill-opacity="0.25" stroke="' + color + '" stroke-width="2"/>';
    dots += '<text x="' + n.x.toFixed(1) + '" y="' + (n.y + 4).toFixed(1) +
      '" text-anchor="middle" font-size="10" fill="#dce6f5" font-family="Consolas,monospace">' +
      courses[n.idx].code + '</text>';
    dots += '<text x="' + n.x.toFixed(1) + '" y="' + (n.y + 30).toFixed(1) +
      '" text-anchor="middle" font-size="9" fill="#8aa0bd">slot ' + (s >= 0 ? s + 1 : '—') + '</text>';
  });
  svg.innerHTML = edges + dots;
}

function renderChart(canvas, history) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, W, H);
  if (!history.length) return;
  const maxY = Math.max.apply(null, history.map((h) => h.best)) || 1;
  const n = history.length;
  ctx.strokeStyle = '#1e2a3d';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = 20 + (H - 50) * (g / 4);
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(W - 10, y);
    ctx.stroke();
    ctx.fillStyle = '#5c718c';
    ctx.font = '10px Consolas';
    ctx.fillText((maxY * (1 - g / 4)).toFixed(1), 6, y + 3);
  }
  const pt = (i, v) => [
    40 + (W - 60) * (i / Math.max(n - 1, 1)),
    20 + (H - 50) * (1 - v / maxY)
  ];
  const draw = (key, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((h, i) => {
      const p = pt(i, h[key]);
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    });
    ctx.stroke();
  };
  draw('mean', '#5c718c');
  draw('best', '#4da3ff');
  ctx.fillStyle = '#5c718c';
  ctx.fillText('mean fitness', W - 120, 16);
  ctx.fillStyle = '#4da3ff';
  ctx.fillText('best fitness', W - 120, 30);
}

function renderTimetable(container, courses, slotOf, numSlots) {
  const slots = [];
  for (let s = 0; s < numSlots; s++) slots.push([]);
  courses.forEach((c) => {
    if (slotOf[c.idx] >= 0) slots[slotOf[c.idx]].push(c);
  });
  const dnames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const perDay = Math.ceil(numSlots / 5);
  let html = '<table class="tt"><tr><th>Slot →</th>';
  for (let s = 0; s < numSlots; s++) {
    const day = Math.floor(s / perDay);
    html += '<th>' + (dnames[day] || 'D' + (day + 1)) + ' · S' + (s + 1) + '</th>';
  }
  html += '</tr><tr><th>Courses</th>';
  for (let s = 0; s < numSlots; s++) {
    const inner = slots[s].map((c) => '<span class="tt-course">' + c.code + '</span>').join('<br>');
    html += '<td>' + (inner || '<span class="tt-free">free</span>') + '</td>';
  }
  html += '</tr></table>';
  container.innerHTML = html;
}

function checkHtml(label, val, cls) {
  return '<div class="check ' + cls + '"><span>' + label + '</span><span class="val">' + val + '</span></div>';
}

function renderFinalChecks(conflicts, slotOf, numSlots) {
  let unassigned = 0;
  slotOf.forEach((s) => { if (s < 0) unassigned++; });
  const used = new Set(slotOf.filter((s) => s >= 0)).size;
  document.getElementById('finalChecks').innerHTML =
    checkHtml('Hard conflicts (shared student, same slot)', conflicts, conflicts === 0 ? 'pass' : 'fail') +
    checkHtml('Unassigned courses', unassigned, unassigned === 0 ? 'pass' : 'fail') +
    checkHtml('Slots used', used + '/' + numSlots, 'pass');
}

function renderAIStats(aiResult, conflictsFinal, greedyUnassigned) {
  document.getElementById('aiStats').innerHTML =
    stat('Best penalty', aiResult.bestScore.toFixed(1)) +
    stat('Generations / iters', aiResult.history.length) +
    stat('Greedy left unplaced', greedyUnassigned) +
    stat('Final hard conflicts', conflictsFinal);
}
