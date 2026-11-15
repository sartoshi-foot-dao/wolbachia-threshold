// PLAN step 2: tipping points with many seeds per point, 1-point spacing.
//
//   node run.mjs [seeds=200] [scale=1] [variants=comma list] > raw.jsonl
//
// Reads the engine from ../../app/index.html. Each run starts with a fraction p0 of all
// mosquitoes infected (uniformly at random), no wild arrivals, and is followed for up to
// 1,500 days: "took over" above 90% of females infected, "died out" below 0.5%.
// p0 = formula tipping point + offset, offsets from -8 to +8 points in steps of 1.
// Seeds are 200..200+seeds-1; a seed fixes both the map and the random draws.
// scale multiplies the map area and the population together (density unchanged).
// Output: one JSON line per run on stdout, progress on stderr.
//
// Environment: MAXDAYS (default 1500) sets how long a run is followed. RERUN=<raw.jsonl>
// reruns only the runs that file marks "undecided" (same seeds, so the same trajectories,
// followed for longer); the other arguments are then ignored except scale.
import { readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export const VARIANTS = {
  'as published': {},
  'shared crowding': { shared: true },
  'random container': { randomLay: true },
  'scattered eggs': { scatter: true },
};

function loadEngine(html, v) {
  let src = html.slice(html.indexOf('function mulberry'), html.indexOf('const $=id=>'));
  const patch = (a, b) => { if (!src.includes(a)) throw new Error('Could not patch: ' + a); src = src.replace(a, b); };
  if (v.shared) {
    const a = 'const d=(this.day+1)%this.larvalDays;';
    patch(a, a + 'let LT=0,KT=0;for(const q of this.sites){LT+=q.L;KT+=q.K}');
    patch('sv=1/(1+s.L/s.K)', 'sv=1/(1+LT/KT)');
  }
  const nearest = 'const s=this.sites[this.near[(this.x[i]/25|0)+(this.y[i]/25|0)*this.lw]]';
  if (v.randomLay) patch(nearest, 'const s=this.sites[this.rand()*this.sites.length|0]');
  if (v.scatter) {
    patch(nearest, 'const s=this.sites[this.rand()*this.sites.length|0]');
    patch('s.w[d]+=U;s.i[d]+=I;s.L+=U+I;',
      'for(let k=0;k<U;k++){const q=this.sites[this.rand()*this.sites.length|0];q.w[d]++;q.L++}' +
      'for(let k=0;k<I;k++){const q=this.sites[this.rand()*this.sites.length|0];q.i[d]++;q.L++}');
  }
  return new Function(src + '\nreturn {Sim, Theory};')();
}

if (!isMainThread) {
  const engines = {};
  const { html, scale, maxDays } = workerData;
  const lin = Math.sqrt(scale);
  parentPort.on('message', j => {
    if (j === null) { parentPort.close(); return; }
    const { Sim } = engines[j.v] || (engines[j.v] = loadEngine(html, VARIANTS[j.v]));
    const s = new Sim({ seed: j.seed, sf: j.sf, sh: 1, mu: 0.01, immigrants: 0,
      W: Math.round(1000 * lin), H: Math.round(640 * lin), target: Math.round(2600 * scale), cap: Math.round(42000 * scale) });
    s.seedShare(j.p0);
    let outcome = 'undecided', days = maxDays;
    for (let d = 0; d < maxDays; d++) {
      s.step();
      const pf = s.hist[s.hist.length - 1].pf;
      if (pf > 0.9) { outcome = 'took over'; days = d + 1; break; }
      if (pf < 0.005) { outcome = 'died out'; days = d + 1; break; }
    }
    parentPort.postMessage({ v: j.v, sf: j.sf, off: j.off, seed: j.seed, scale, outcome, days, maxDays, pfEnd: +s.hist[s.hist.length - 1].pf.toFixed(4) });
  });
} else {
  const seeds = +(process.argv[2] || 200), scale = +(process.argv[3] || 1);
  const names = process.argv[4] ? process.argv[4].split(',') : Object.keys(VARIANTS);
  const html = readFileSync(here + '../../app/index.html', 'utf8');
  const { Theory } = loadEngine(html, {});
  const COSTS = [0.1, 0.25, 0.4];
  const maxDays = +(process.env.MAXDAYS || 1500);
  const jobs = [];
  if (process.env.RERUN) {
    for (const l of readFileSync(process.env.RERUN, 'utf8').trim().split('\n')) {
      const r = JSON.parse(l);
      if (r.outcome === 'undecided') jobs.push({ v: r.v, sf: r.sf, off: r.off, p0: Theory.roots(r.sf, 1, 0.01).thr + r.off / 100, seed: r.seed });
    }
  } else for (const v of names) for (const sf of COSTS) {
    const thr = Theory.roots(sf, 1, 0.01).thr;
    for (let o = -8; o <= 8; o++) for (let k = 0; k < seeds; k++) jobs.push({ v, sf, off: o, p0: thr + o / 100, seed: 200 + k });
  }
  const total = jobs.length, t0 = Date.now();
  let done = 0, next = 0;
  const n = Math.min(cpus().length, total);
  await Promise.all(Array.from({ length: n }, () => new Promise((ok, fail) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { html, scale, maxDays } });
    const feed = () => w.postMessage(next < total ? jobs[next++] : null);
    w.on('message', m => {
      process.stdout.write(JSON.stringify(m) + '\n');
      if (++done % 500 === 0) process.stderr.write(`${done}/${total} ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
      feed();
    });
    w.on('error', fail); w.on('exit', ok);
    feed();
  })));
  process.stderr.write(`done ${done}/${total} in ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
}
