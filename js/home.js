// home.js — draws the small decorative-but-real conflict graph on the home page.
'use strict';

(function () {
  const svg = document.getElementById('heroGraph');
  if (!svg) return;

  // A fixed, pretty little instance: 8 courses, some shared students.
  const rng = makeRng(20260731);
  const names = ['CS101', 'CS205', 'CS233', 'CS315', 'CS344', 'CS411', 'CS502', 'MA210'];
  const n = names.length;
  const adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  const addEdge = (a, b) => {
    if (a !== b && adj[a].indexOf(b) < 0) { adj[a].push(b); adj[b].push(a); }
  };
  // Deterministic plausible conflicts
  addEdge(0, 1); addEdge(0, 2); addEdge(1, 2); addEdge(1, 3);
  addEdge(2, 4); addEdge(3, 4); addEdge(3, 5); addEdge(5, 6);
  addEdge(4, 7); addEdge(6, 7);

  // A tiny greedy coloring so the picture shows a real schedule.
  const slotOf = new Array(n).fill(-1);
  for (let c = 0; c < n; c++) {
    const used = adj[c].map((nb) => slotOf[nb]).filter((s) => s >= 0);
    let s = 0;
    while (used.indexOf(s) >= 0) s++;
    slotOf[c] = s;
  }

  // Layout: soft ellipse
  const W = 420, H = 300, cx = W / 2, cy = H / 2, rx = 150, ry = 100;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const ang = (2 * Math.PI * i) / n - Math.PI / 2;
    pos.push({ x: cx + rx * Math.cos(ang), y: cy + ry * Math.sin(ang) });
  }
  let edges = '';
  for (let a = 0; a < n; a++) {
    for (const b of adj[a]) {
      if (b > a) {
        edges += '<line x1="' + pos[a].x.toFixed(1) + '" y1="' + pos[a].y.toFixed(1) +
          '" x2="' + pos[b].x.toFixed(1) + '" y2="' + pos[b].y.toFixed(1) +
          '" stroke="#e0d3c1" stroke-width="1.6"/>';
      }
    }
  }
  const palette = ['#a5b4fc', '#9ee2c0', '#fcd6a4', '#f7a8b8', '#c9b3f5', '#93e2d5'];
  let dots = '';
  for (let i = 0; i < n; i++) {
    const color = palette[slotOf[i] % palette.length];
    dots += '<circle cx="' + pos[i].x.toFixed(1) + '" cy="' + pos[i].y.toFixed(1) +
      '" r="19" fill="' + color + '" fill-opacity="0.55" stroke="' + color + '" stroke-width="2.5"/>';
    dots += '<text x="' + pos[i].x.toFixed(1) + '" y="' + (pos[i].y + 3.5).toFixed(1) +
      '" text-anchor="middle" font-size="9.5" fill="#38312a" font-family="Consolas,monospace">' +
      names[i] + '</text>';
  }
  svg.innerHTML = edges + dots;
})();
