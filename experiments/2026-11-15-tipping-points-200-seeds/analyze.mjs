// Fit a tipping point to the output of run.mjs.
//
//   node analyze.mjs raw-1x.jsonl [rerun-1x-6000.jsonl ...] > results.json
//
// When the same run (variant, cost, offset, seed, scale) appears more than once, the copy
// followed for the most days wins, so a longer rerun of an undecided run replaces it.
//
// For each variant, cost and population scale: the share of runs that took over at each
// starting offset, a logistic curve fitted by maximum likelihood to the run-level outcomes,
// and the offset where that curve crosses 50% (the tipping point, in points from the formula).
// Intervals: 95% percentile bootstrap, 2,000 resamples of whole seeds (a seed fixes the map,
// and the same seeds are used at every offset, so runs sharing a seed are not independent).
// Differences between variants reuse the same resampled seeds. Runs still "undecided"
// (neither outcome by the last day followed) count as not taking over in the main estimate;
// tippingPointIfUndecidedTakeOver counts them the other way. Where many runs never decide (they
// can sit at a middling share indefinitely), the tipping point is a range, not a number.
import { readFileSync } from 'node:fs';

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// counts: array over offsets of [took over, runs]. Returns {a,b,x50} for p = 1/(1+exp(-(a+b*x))).
function logistic(xs, k, n) {
  let a = 0, b = 0.5;
  for (let it = 0; it < 60; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    for (let i = 0; i < xs.length; i++) {
      const p = 1 / (1 + Math.exp(-(a + b * xs[i]))), w = n[i] * p * (1 - p), r = k[i] - n[i] * p;
      g0 += r; g1 += r * xs[i]; h00 += w; h01 += w * xs[i]; h11 += w * xs[i] * xs[i];
    }
    h00 += 1e-9; h11 += 1e-9;
    const det = h00 * h11 - h01 * h01; if (!(Math.abs(det) > 1e-12)) break;
    let da = (h11 * g0 - h01 * g1) / det, db = (h00 * g1 - h01 * g0) / det;
    const m = Math.max(Math.abs(da), Math.abs(db)); if (m > 2) { da *= 2 / m; db *= 2 / m; }
    a += da; b += db;
    if (m < 1e-9) break;
  }
  return { a, b, x50: -a / b };
}
// Where the raw shares first cross 50%, by straight-line interpolation (the published method).
function crossing(xs, k, n) {
  for (let i = 1; i < xs.length; i++) { const f0 = k[i - 1] / n[i - 1], f1 = k[i] / n[i]; if (f0 < 0.5 && f1 >= 0.5) return xs[i - 1] + (0.5 - f0) / (f1 - f0) * (xs[i] - xs[i - 1]); }
  return null;
}

const all = process.argv.slice(2).flatMap(f => readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l)));
const best = new Map();
for (const r of all) { const id = [r.scale, r.v, r.sf, r.off, r.seed].join('|'), o = best.get(id); if (!o || (r.maxDays || 1500) > (o.maxDays || 1500)) best.set(id, r); }
const rows = [...best.values()];
const key = r => `${r.scale}x | ${r.v} | ${r.sf}`;
const groups = new Map();
for (const r of rows) { if (!groups.has(key(r))) groups.set(key(r), []); groups.get(key(r)).push(r); }
const OFFS = [...new Set(rows.map(r => r.off))].sort((a, b) => a - b);
const B = 2000, q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r2 = x => x === null ? null : Math.round(x * 100) / 100;

const out = { method: 'see analyze.mjs', offsets: OFFS, cells: {}, differences: {} };
const boots = {};
for (const [name, g] of groups) {
  const seeds = [...new Set(g.map(r => r.seed))].sort((a, b) => a - b), si = new Map(seeds.map((s, i) => [s, i]));
  // took[seed][offset] = 1 if took over
  const took = seeds.map(() => new Uint8Array(OFFS.length)), have = seeds.map(() => new Uint8Array(OFFS.length));
  let undecided = 0;
  for (const r of g) { const i = si.get(r.seed), j = OFFS.indexOf(r.off); have[i][j] = 1; if (r.outcome === 'took over') took[i][j] = 1; if (r.outcome === 'undecided') undecided++; }
  const k = OFFS.map((_, j) => took.reduce((a, t) => a + t[j], 0)), n = OFFS.map((_, j) => have.reduce((a, t) => a + t[j], 0));
  const fit = logistic(OFFS, k, n);
  const und = OFFS.map(o => g.filter(r => r.off === o && r.outcome === 'undecided').length);
  const fitHi = logistic(OFFS, k.map((x, j) => x + und[j]), n);
  const rand = mulberry(12345), bs = [];   // same seed stream for every cell, so resamples line up across variants
  for (let b = 0; b < B; b++) {
    const kb = new Array(OFFS.length).fill(0), nb = new Array(OFFS.length).fill(0);
    for (let s = 0; s < seeds.length; s++) { const i = rand() * seeds.length | 0; for (let j = 0; j < OFFS.length; j++) { kb[j] += took[i][j]; nb[j] += have[i][j]; } }
    bs.push(logistic(OFFS, kb, nb).x50);
  }
  boots[name] = bs;
  out.cells[name] = {
    runs: g.length, seeds: seeds.length, undecided, followedDaysMax: Math.max(...g.map(r => r.maxDays || 1500)),
    tippingPointIfUndecidedTakeOver: r2(fitHi.x50),
    tookOverByOffset: k, runsByOffset: n,
    tippingPoint: r2(fit.x50), ci95: [r2(q(bs, 0.025)), r2(q(bs, 0.975))],
    slopePerPoint: r2(fit.b), widthPoints10to90: r2(2 * Math.log(9) / fit.b),
    interpolatedCrossing: r2(crossing(OFFS, k, n)),
    medianDaysToDecide: q(g.filter(r => r.outcome !== 'undecided').map(r => r.days), 0.5),
  };
}
const diff = (A, Bn, label) => {
  if (!boots[A] || !boots[Bn]) return;
  const d = boots[A].map((x, i) => x - boots[Bn][i]);
  out.differences[label] = { estimate: r2(out.cells[A].tippingPoint - out.cells[Bn].tippingPoint), ci95: [r2(q(d, 0.025)), r2(q(d, 0.975))] };
};
for (const sc of [...new Set(rows.map(r => r.scale))]) for (const sf of [0.1, 0.25, 0.4]) {
  diff(`${sc}x | as published | ${sf}`, `${sc}x | scattered eggs | ${sf}`, `${sc}x, cost ${sf}: as published minus scattered eggs`);
  diff(`${sc}x | as published | ${sf}`, `${sc}x | random container | ${sf}`, `${sc}x, cost ${sf}: as published minus random container`);
  diff(`${sc}x | random container | ${sf}`, `${sc}x | scattered eggs | ${sf}`, `${sc}x, cost ${sf}: random container minus scattered eggs`);
  diff(`${sc}x | shared crowding | ${sf}`, `${sc}x | as published | ${sf}`, `${sc}x, cost ${sf}: shared crowding minus as published`);
}
console.log(JSON.stringify(out, null, 1));
