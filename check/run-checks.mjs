// Reproduces the numbers in https://zidingz.com/wolbachia-tipping-point/
//
//   node run-checks.mjs            # everything (about 12 CPU-minutes, spread over all cores)
//   node run-checks.mjs threshold  # tipping-point check only
//   node run-checks.mjs scenarios  # the five scenarios only
//
// Needs Node 18 or later and nothing else. The simulation code is read from
// ../app/index.html, the same file the page runs, so this checks what readers see.
// If you downloaded this script on its own, it fetches that page from zidingz.com.
// Every run uses a fixed seed, so the output is identical each time.
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

const PAGE_URL = 'https://zidingz.com/experiments/wolbachia-sweep/app/';
async function pageSource() {
  try { return readFileSync(here + '../app/index.html', 'utf8'); }
  catch {
    process.stderr.write(`No ../app/index.html next to this script; fetching ${PAGE_URL}\n`);
    const r = await fetch(PAGE_URL);
    if (!r.ok) throw new Error(`Could not fetch ${PAGE_URL}: HTTP ${r.status}`);
    return r.text();
  }
}
function loadEngine(html) {
  const start = html.indexOf('function mulberry');
  const end = html.indexOf('const $=id=>');
  if (start < 0 || end < start) throw new Error('Could not find the simulation code in ../app/index.html');
  return new Function(html.slice(start, end) + '\nreturn {Sim, Theory};')();
}
// A test variant: larvae compete for room across the whole map instead of inside their own
// container. Used only to test why the simulated tipping point sits below the formula.
// With mixMoves, adults also wander 150 m a day instead of 22 m, so who meets whom no longer
// depends on where they were born (positions are kept inside the map, which such long steps
// would otherwise leave). Used to test why the shared-crowding variant sits above the formula.
function loadPooledEngine(html, mixMoves = false) {
  let src = html.slice(html.indexOf('function mulberry'), html.indexOf('const $=id=>'));
  const a = 'const d=(this.day+1)%this.larvalDays;', b = 'sv=1/(1+s.L/s.K)';
  if (!src.includes(a) || !src.includes(b)) throw new Error('Could not patch the crowding rule');
  src = src.replace(a, a + 'let LT=0,KT=0;for(const q of this.sites){LT+=q.L;KT+=q.K}').replace(b, 'sv=1/(1+LT/KT)');
  if (mixMoves) {
    const m = 'this.x[i]=X;this.y[i]=Y;';
    if (!src.includes(m)) throw new Error('Could not patch the movement rule');
    src = src.replace(m, 'X=Math.min(this.W-1,Math.max(0,X));Y=Math.min(this.H-1,Math.max(0,Y));' + m);
  }
  return new Function(src + '\nreturn {Sim, Theory};')();
}

// One run of each kind. Returns plain numbers.
let pooledSim = null, mixedSim = null;
function runOne(job, { Sim, Theory }) {
  if (job.kind === 'assortment') {
    // Shared-crowding variant started at the formula's tipping point (25% egg cost). Over
    // time windows, compare how often wild females mated infected males with how often they
    // would under random mating (the share of males infected that day). Days when the male
    // share has drifted far from the tipping point (outside 10-60%) are skipped.
    const s = new pooledSim({ seed: job.seed, sf: 0.25, sh: 1, mu: 0.01, immigrants: 0 });
    s.seedShare(0.26);
    const win = job.windows.map(() => ({ seen: 0, expected: 0 }));
    for (let d = 0; d < 300; d++) {
      const before = s.mat.slice(), c = s.cur;
      s.step();
      const wildWild = s.mat[0] - before[0] * 0.967, wildInf = s.mat[1] - before[1] * 0.967; // new matings today
      const pm = c.am ? c.mi / c.am : 0, w = job.windows.findIndex(([a, b]) => d >= a && d < b);
      if (pm > 0.1 && pm < 0.6) { win[w].seen += wildInf; win[w].expected += (wildWild + wildInf) * pm; }
    }
    return { ...job, win };
  }
  if (job.kind === 'threshold') {
    // Two verdicts. The first version of the post asked only whether the infected share
    // was above 50% on day 260. That is too short near a low tipping point, where the
    // share climbs slowly, so runs now also continue until the infection passes 90%
    // (took over), falls below 0.5% (died out), or 1,500 days pass (undecided).
    const s = job.pooled === 'mixed moves'
      ? new mixedSim({ seed: job.seed, sf: job.sf, sh: 1, mu: 0.01, immigrants: job.immigrants, step_m: 150 })
      : new (job.pooled ? pooledSim : Sim)({ seed: job.seed, sf: job.sf, sh: 1, mu: 0.01, immigrants: job.immigrants });
    s.seedShare(job.p0);
    let pf260 = null, outcome = 'undecided', day = 0;
    for (; day < 1500; day++) {
      s.step();
      const pf = s.hist[s.hist.length - 1].pf;
      if (day === 259) pf260 = pf;
      if (pf > 0.9) { outcome = 'took over'; break; }
      if (pf < 0.005) { outcome = 'died out'; break; }
    }
    if (pf260 === null) pf260 = outcome === 'took over' ? 1 : 0;
    return { ...job, pfEnd: pf260, tookOver: pf260 > 0.5, outcome, decidedOnDay: day + 1 };
  }
  const p = job.preset;
  const s = new Sim({ seed: job.seed, sf: p.sf / 100, sh: p.sh / 100, mu: p.mu / 100 });
  s.plan = { pct: p.pct, weeks: p.weeks, sexes: p.sexes, area: p.where === 'all' ? 'all' : { x: 220, y: 320, r: 140 } };
  const stable = Theory.roots(s.sf, s.sh, s.mu).stable;
  let day90 = null, minFem = Infinity, minFemDay = 0, at = {};
  for (let d = 1; d <= p.h; d++) {
    s.step();
    const h = s.hist[s.hist.length - 1];
    if (day90 === null && stable && h.pf >= 0.9 * stable) day90 = d;
    if (h.fem < minFem) { minFem = h.fem; minFemDay = d; }
    if (p.at.includes(d)) at[d] = { pf: h.pf, fem: h.fem, wild: h.wild };
  }
  let spread = null;
  if (p.trace) { // where the infected and wild adults sit at the end (mean distance from the left edge, metres)
    let xi = 0, ni = 0, xw = 0, nw = 0;
    for (let i = 0; i < s.n; i++) { if (s.inf[i]) { xi += s.x[i]; ni++; } else { xw += s.x[i]; nw++; } }
    spread = { infectedMeanX: Math.round(xi / (ni || 1)), wildMeanX: Math.round(xw / (nw || 1)) };
  }
  return { kind: 'scenario', id: p.id, seed: job.seed, day90, minFem, minFemDay, at, spread };
}

// Same settings as the scenario buttons on the page (PRESETS in index.html).
const PRESETS = [
  { id: 'over', label: 'Both sexes, 20%/week for 8 weeks', sexes: 'both', where: 'all', pct: 20, weeks: 8, sf: 25, sh: 100, mu: 1, h: 300, at: [240, 300] },
  { id: 'under', label: 'Both sexes, 5%/week for 6 weeks', sexes: 'both', where: 'all', pct: 5, weeks: 6, sf: 25, sh: 100, mu: 1, h: 300, at: [300] },
  { id: 'costly', label: 'Same 20% release, 60% egg cost', sexes: 'both', where: 'all', pct: 20, weeks: 8, sf: 60, sh: 100, mu: 1, h: 300, at: [300] },
  { id: 'males', label: 'Males only, 100%/week for 30 weeks', sexes: 'males', where: 'all', pct: 100, weeks: 30, sf: 25, sh: 100, mu: 1, h: 420, at: [210, 420] },
  { id: 'wave', label: 'Both sexes, one neighbourhood', sexes: 'both', where: 'patch', pct: 200, weeks: 8, sf: 25, sh: 100, mu: 1, h: 900, at: [150, 300, 450, 600, 720, 750, 900], trace: true },
];

if (!isMainThread) {
  const engine = loadEngine(workerData.html);
  pooledSim = loadPooledEngine(workerData.html).Sim;
  mixedSim = loadPooledEngine(workerData.html, true).Sim;
  for (const job of workerData.jobs) parentPort.postMessage(runOne(job, engine));
  parentPort.close();
} else {
  const which = process.argv[2] || 'all';
  const html = await pageSource();
  const { Theory } = loadEngine(html);
  const SEEDS = Array.from({ length: 20 }, (_, i) => 200 + i); // the first 6 are the original check
  const COSTS = [0.1, 0.25, 0.4];
  const OFFSETS = [-0.1, -0.06, -0.05, -0.04, -0.02, 0, 0.02, 0.05, 0.1];
  const jobs = [];
  if (which === 'all' || which === 'threshold')
    for (const immigrants of [3, 0]) for (const sf of COSTS) {
      const thr = Theory.roots(sf, 1, 0.01).thr;
      for (const off of OFFSETS) for (const seed of SEEDS)
        jobs.push({ kind: 'threshold', immigrants, sf, thr, off, p0: thr + off, seed });
    }
  if (which === 'all' || which === 'threshold')
    for (const sf of COSTS) {
      const thr = Theory.roots(sf, 1, 0.01).thr;
      for (const off of OFFSETS) for (const seed of SEEDS)
        jobs.push({ kind: 'threshold', pooled: true, immigrants: 0, sf, thr, off, p0: thr + off, seed });
    }
  if (which === 'all' || which === 'threshold') {
    for (const sf of COSTS) {
      const thr = Theory.roots(sf, 1, 0.01).thr;
      for (const off of OFFSETS) for (const seed of SEEDS)
        jobs.push({ kind: 'threshold', pooled: 'mixed moves', immigrants: 0, sf, thr, off, p0: thr + off, seed });
    }
    for (let i = 0; i < 12; i++) jobs.push({ kind: 'assortment', seed: 300 + i, windows: [[0, 30], [30, 90], [90, 180], [180, 300]] });
  }
  if (which === 'all' || which === 'scenarios')
    for (const preset of PRESETS) for (let i = 0; i < 20; i++) jobs.push({ kind: 'scenario', preset, seed: 1000 + i });

  // longest jobs first, dealt round-robin to one worker per core
  jobs.sort((a, b) => (b.preset?.h || 260) - (a.preset?.h || 260));
  const n = Math.max(1, Math.min(cpus().length, jobs.length));
  const buckets = Array.from({ length: n }, () => []);
  jobs.forEach((j, i) => buckets[i % n].push(j));
  const results = [];
  const t0 = Date.now();
  await Promise.all(buckets.map(b => new Promise((res, rej) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { html, jobs: b } });
    w.on('message', r => { results.push(r); if (results.length % 50 === 0) process.stderr.write(`${results.length}/${jobs.length} runs\n`); });
    w.on('error', rej); w.on('exit', res);
  })));
  process.stderr.write(`${results.length} runs in ${((Date.now() - t0) / 1000).toFixed(0)} s on ${n} cores\n`);

  const pct = x => Math.round(x * 100) + '%';
  const range = xs => { const s = xs.slice().sort((a, b) => a - b); return { min: s[0], median: s[s.length >> 1], max: s[s.length - 1] }; };
  const out = { generated: new Date().toISOString(), summary: {} };
  const lines = [];

  const th = results.filter(r => r.kind === 'threshold');
  if (th.length) {
    out.summary.threshold = {};
    const ORIGINAL = [-0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1];
    const table = (label, pick, offsets, won) => {
      lines.push(`\nTipping-point check (${label}):`);
      lines.push('offset  ' + COSTS.map(c => `cost ${pct(c)}`.padEnd(13)).join('') + 'all');
      const tab = {};
      for (const off of offsets) {
        const row = COSTS.map(sf => { const g = th.filter(r => pick(r) && r.sf === sf && r.off === off); return [g.filter(won).length, g.length]; });
        const tot = row.reduce((a, [k, m]) => [a[0] + k, a[1] + m], [0, 0]);
        tab[off] = { byCost: row, all: tot };
        lines.push(`${(off >= 0 ? '+' : '') + Math.round(off * 100)} pts`.padEnd(8) + row.map(([k, m]) => `${k}/${m}`.padEnd(13)).join('') + `${tot[0]}/${tot[1]}`);
      }
      out.summary.threshold[label] = tab;
    };
    const day260 = r => r.tookOver, longRun = r => r.outcome === 'took over', open = r => r.outcome === 'undecided';
    table('original check: 6 seeds, wild arrivals on; above 50% on day 260', r => !r.pooled && r.immigrants === 3 && r.seed < 206, ORIGINAL, day260);
    table('20 seeds, wild arrivals on; above 50% on day 260', r => !r.pooled && r.immigrants === 3, ORIGINAL, day260);
    table('20 seeds, wild arrivals off; above 50% on day 260', r => !r.pooled && r.immigrants === 0, ORIGINAL, day260);
    table('20 seeds, wild arrivals on; took over within 1,500 days', r => !r.pooled && r.immigrants === 3, OFFSETS, longRun);
    table('20 seeds, wild arrivals off; took over within 1,500 days', r => !r.pooled && r.immigrants === 0, OFFSETS, longRun);
    table('20 seeds, wild arrivals off; still undecided at 1,500 days', r => !r.pooled && r.immigrants === 0, OFFSETS, open);
    table('test variant, crowding shared across the map, wild arrivals off; took over within 1,500 days', r => r.pooled === true, OFFSETS, longRun);
    table('test variant, crowding shared and adults well mixed, wild arrivals off; took over within 1,500 days', r => r.pooled === 'mixed moves', OFFSETS, longRun);
    // Where half the runs take over, by linear interpolation between offsets (points relative to the formula).
    const crossing = pick => Object.fromEntries(COSTS.map(sf => {
      const fr = OFFSETS.map(off => { const g = th.filter(r => pick(r) && r.sf === sf && r.off === off); return g.filter(longRun).length / g.length; });
      for (let i = 1; i < OFFSETS.length; i++) if (fr[i - 1] < 0.5 && fr[i] >= 0.5)
        return [sf, Math.round(100 * (OFFSETS[i - 1] + (0.5 - fr[i - 1]) / (fr[i] - fr[i - 1]) * (OFFSETS[i] - OFFSETS[i - 1])) * 10) / 10];
      return [sf, null];
    }));
    out.summary.halfTakeOverPointsFromFormula = {
      'wild arrivals on': crossing(r => !r.pooled && r.immigrants === 3),
      'wild arrivals off': crossing(r => !r.pooled && r.immigrants === 0),
      'test variant, crowding shared across the map': crossing(r => r.pooled === true),
      'test variant, crowding shared and adults well mixed': crossing(r => r.pooled === 'mixed moves'),
    };
    lines.push('\nWhere half the runs take over, in points from the formula (by cost):');
    for (const [k, v] of Object.entries(out.summary.halfTakeOverPointsFromFormula)) lines.push(`  ${k}: ` + COSTS.map(c => `${pct(c)}: ${v[c] > 0 ? '+' : ''}${v[c]}`).join(', '));
  }

  const as = results.filter(r => r.kind === 'assortment');
  if (as.length) {
    lines.push('\nShared-crowding variant from the tipping point: wild females mating infected males, relative to random mating:');
    out.summary.assortment = {};
    as[0].windows.forEach(([a, b], i) => {
      const seen = as.reduce((t, r) => t + r.win[i].seen, 0), exp = as.reduce((t, r) => t + r.win[i].expected, 0);
      out.summary.assortment[`days ${a}-${b}`] = Math.round(seen / exp * 1000) / 1000;
      lines.push(`  days ${a}-${b}: ${(seen / exp).toFixed(3)}`);
    });
  }

  const sc = results.filter(r => r.kind === 'scenario');
  if (sc.length) {
    out.summary.scenarios = {};
    lines.push('\nScenarios, 20 seeds each (min / median / max):');
    for (const p of PRESETS) {
      const g = sc.filter(r => r.id === p.id);
      const s = { label: p.label, runs: g.length };
      for (const d of p.at) {
        s['femalesInfectedDay' + d] = range(g.map(r => r.at[d].pf));
        s['femalesVsBaselineDay' + d] = range(g.map(r => r.at[d].fem));
      }
      const reached = g.filter(r => r.day90 !== null);
      s.reached90pctOfSaturation = `${reached.length}/${g.length}`;
      if (reached.length) s.dayReached = range(reached.map(r => r.day90));
      s.lowestFemales = range(g.map(r => r.minFem));
      s.lowestFemalesDay = range(g.map(r => r.minFemDay));
      if (p.trace) s.perRun = g.sort((a, b) => a.seed - b.seed).map(r => ({ seed: r.seed, femalesInfectedByDay: Object.fromEntries(p.at.map(d => [d, Math.round(r.at[d].pf * 100) / 100])), ...r.spread }));
      out.summary.scenarios[p.id] = s;
      const f = r => `${pct(r.min)} / ${pct(r.median)} / ${pct(r.max)}`;
      lines.push(`- ${p.label}`);
      for (const d of p.at) if (!p.trace || d === 720 || d === 900) lines.push(`    day ${d}: females infected ${f(s['femalesInfectedDay' + d])}; females vs pre-release ${f(s['femalesVsBaselineDay' + d])}`);
      lines.push(`    reached 90% of saturation in ${s.reached90pctOfSaturation} runs` + (s.dayReached ? `, on day ${s.dayReached.min} / ${s.dayReached.median} / ${s.dayReached.max}` : ''));
      if (p.trace) for (const r of s.perRun) if (r.femalesInfectedByDay[900] < 0.9 * 0.99)
        lines.push(`    seed ${r.seed}: infected share every 150 days ${p.at.filter(d => d % 150 === 0).map(d => pct(r.femalesInfectedByDay[d])).join(' ')}; infected sit ${r.infectedMeanX} m from the left edge on average, wild ${r.wildMeanX} m`);
      lines.push(`    lowest female count ${f(s.lowestFemales)} of pre-release, on day ${s.lowestFemalesDay.min} / ${s.lowestFemalesDay.median} / ${s.lowestFemalesDay.max}`);
    }
  }
  console.log(lines.join('\n'));
  if (which === 'all') { delete out.generated; writeFileSync(here + 'results.json', JSON.stringify(out, null, 2) + '\n'); }
}
