// Why did one neighbourhood-release run in https://zidingz.com/wolbachia-tipping-point/ stall?
//
//   node stall-check.mjs
//
// Needs Node 18 or later. Like run-checks.mjs, it reads the simulation code from
// ../app/index.html (or fetches the live page) and uses fixed seeds.
// About 160 runs of 900 days; roughly a minute on a 12-core laptop.
//
// Each Sim seed fixes two things: the street map (where the breeding sites are and
// how many larvae each can hold) and the luck of the run. To separate them, a run
// here builds the map from one seed, then swaps in a fresh random stream after the
// warm-up, just before the first release.
import { readFileSync } from 'node:fs';
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
  return new Function(html.slice(start, end) + '\nreturn {Sim, mulberry};')();
}

// The 'One neighbourhood' scenario: both sexes, 200% of females a week for 8 weeks,
// in a 140 m circle near the left edge.
function runOne(job, { Sim, mulberry }) {
  class Run extends Sim {
    buildCity() {
      super.buildCity();
      if (job.flat) { // same sites, same total capacity, but every site holds the same number of larvae
        const m = this.sites.reduce((a, s) => a + s.K, 0) / this.sites.length;
        for (const s of this.sites) s.K = m;
      }
    }
  }
  const s = new Run({ seed: job.map, sf: 0.25, sh: 1, mu: 0.01, immigrants: job.immigrants });
  if (job.luck != null) s.rand = mulberry(job.luck);
  s.plan = { pct: 200, weeks: 8, sexes: 'both', area: { x: 220, y: 320, r: 140 } };
  for (let d = 0; d < job.days; d++) s.step();
  return { ...job, pf: s.hist[s.hist.length - 1].pf };
}

// Larval capacity per metre of width ahead of the release (x >= 500 m) divided by
// that just behind the front (200-500 m).
function capacityRatio(Sim, seed) {
  const s = new Sim({ seed });
  let ahead = 0, behind = 0;
  for (const t of s.sites) { if (t.x >= 500) ahead += t.K; else if (t.x >= 200) behind += t.K; }
  return (ahead / 500) / (behind / 300);
}

if (!isMainThread) {
  const engine = loadEngine(workerData.html);
  for (const job of workerData.jobs) parentPort.postMessage(runOne(job, engine));
  parentPort.close();
} else {
  const html = await pageSource();
  const { Sim } = loadEngine(html);
  const LUCK = Array.from({ length: 20 }, (_, i) => 5000 + i);
  const jobs = [{ test: 'long', map: 1011, luck: null, immigrants: 3, days: 2500 }];
  for (const map of [1011, 1000, 1001]) for (const luck of LUCK) jobs.push({ test: 'map', map, luck, immigrants: 3, days: 900 });
  for (const map of [1011, 1000]) for (const luck of LUCK) jobs.push({ test: 'flat', map, luck, immigrants: 3, days: 900, flat: true });
  for (const luck of LUCK) jobs.push({ test: 'noArrivals', map: 1011, luck, immigrants: 0, days: 900 });

  const n = Math.max(1, Math.min(cpus().length, jobs.length));
  const buckets = Array.from({ length: n }, () => []);
  jobs.forEach((j, i) => buckets[i % n].push(j));
  const results = [];
  await Promise.all(buckets.map(b => new Promise((ok, fail) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { html, jobs: b } });
    w.on('message', m => results.push(m)); w.on('error', fail); w.on('exit', ok);
  })));

  const pct = x => Math.round(x * 100) + '%';
  const line = (label, rs) => {
    rs.sort((a, b) => a.luck - b.luck);
    const sorted = rs.map(r => r.pf).sort((a, b) => a - b);
    console.log(`${label}: ${rs.filter(r => r.pf >= 0.89).length} of ${rs.length} past 90% by day 900, median ${pct(sorted[sorted.length >> 1])}`);
  };
  const long = results.find(r => r.test === 'long');
  console.log(`Map 1011 with its original luck, run to day 2500: females infected ${pct(long.pf)}\n`);
  console.log('Same map, 20 different runs of luck each:');
  for (const map of [1011, 1000, 1001]) line(`  map ${map} (capacity ahead/behind ${capacityRatio(Sim, map).toFixed(2)})`, results.filter(r => r.test === 'map' && r.map === map));
  console.log('\nSame maps with every breeding site holding the same number of larvae:');
  for (const map of [1011, 1000]) line(`  map ${map}, even capacity`, results.filter(r => r.test === 'flat' && r.map === map));
  console.log('\nWild arrivals from the map edges switched off:');
  line('  map 1011, no arrivals', results.filter(r => r.test === 'noArrivals'));

  // The 20 published wave runs (seeds 1000-1019 in run-checks.mjs): capacity ratio vs day-900 result.
  let published = null;
  try { published = JSON.parse(readFileSync(here + 'results.json', 'utf8')).summary.scenarios; } catch {}
  const wave = published && Object.values(published).find(x => x.perRun);
  if (wave) {
    const rows = wave.perRun.map(r => ({ seed: r.seed, ratio: capacityRatio(Sim, r.seed), pf: r.femalesInfectedByDay[900] }));
    const mx = rows.reduce((a, r) => a + r.ratio, 0) / rows.length, my = rows.reduce((a, r) => a + r.pf, 0) / rows.length;
    let sxy = 0, sxx = 0, syy = 0;
    for (const r of rows) { sxy += (r.ratio - mx) * (r.pf - my); sxx += (r.ratio - mx) ** 2; syy += (r.pf - my) ** 2; }
    console.log(`\nThe 20 published wave runs: correlation between capacity ahead/behind and day-900 infection = ${(sxy / Math.sqrt(sxx * syy)).toFixed(2)}`);
    for (const r of rows.sort((a, b) => b.ratio - a.ratio).slice(0, 4)) console.log(`  seed ${r.seed}: capacity ahead/behind ${r.ratio.toFixed(2)}, day 900 ${pct(r.pf)}`);
  }
}
